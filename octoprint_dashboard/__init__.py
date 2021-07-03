# coding=utf-8
from __future__ import absolute_import
from __future__ import unicode_literals
import octoprint.plugin
from octoprint.util import RepeatedTimer, ResettableTimer
import octoprint.filemanager
import octoprint.filemanager.util
from octoprint.filemanager import FileDestinations
import octoprint.util
from octoprint.events import Events, eventManager
from collections import deque
noAccessPermissions = False
try:
	from octoprint.access import ADMIN_GROUP
	from octoprint.access.permissions import Permissions
except ImportError:
    noAccessPermissions = True
from datetime import datetime
from datetime import timedelta
import time, subprocess, json, platform, re, psutil, sys, os


class GcodePreProcessor(octoprint.filemanager.util.LineProcessorStream):

	def __init__(self, fileBufferedReader, layer_indicator_patterns, layer_move_pattern, filament_change_pattern, python_version, logger):
		super(GcodePreProcessor, self).__init__(fileBufferedReader)
		self.layer_indicator_patterns = layer_indicator_patterns
		self.layer_move_pattern = layer_move_pattern
		self.filament_change_pattern = filament_change_pattern
		self.python_version = python_version
		self.layer_count = 0
		self.layer_moves = 0
		self.layer_move_array = []
		self.filament_change_array = []
		self._logger = logger
		self.meta_ed = False

	def process_line(self, origLine):
		if not len(origLine):
			return None

		if (self.python_version == 3):
			line = origLine.decode('utf-8').lstrip()

		if re.match(self.layer_move_pattern, line) is not None:
			self.layer_moves += 1

		if self.filament_change_pattern.match(line):
			# give the number of moves in that the change is at
			self.filament_change_array.append(sum(self.layer_move_array) + self.layer_moves)

		for layer_indicator_pattern in self.layer_indicator_patterns:
			if layer_indicator_pattern.match(line):
				self.layer_count += 1
				line = line + "M117 DASHBOARD_LAYER_INDICATOR " + str(self.layer_count) + "\r\n"
				# self._logger.debug("{}: {}".format(self.layer_count, self.layer_moves))
				self.layer_move_array.append(self.layer_moves)
				self.layer_moves = 0
				break # Skip trying to match more patterns

		if (self.python_version == 3):
			line = line.encode('utf-8')

		return line


class DashboardPlugin(octoprint.plugin.SettingsPlugin,
					  octoprint.plugin.StartupPlugin,
					  octoprint.plugin.AssetPlugin,
					  octoprint.plugin.TemplatePlugin,
					  octoprint.plugin.EventHandlerPlugin,
					  octoprint.plugin.SimpleApiPlugin):

	printer_message = ""
	extruded_filament = 0.0
	extruded_filament_store = 0.0
	extruder_mode = ""
	cpu_percent = 0
	cpu_temp = 0
	cpu_freq = 0
	virtual_memory_percent = 0
	disk_usage = 0
	layer_times = []
	average_layer_times = []
	layer_labels = []
	cmd_commands= []
	cmd_timers = []
	python_version = 0
	is_preprocessed = False
	gcode_preprocessor = None
	layer_indicator_config = []
	layer_indicator_patterns = []
	layer_start_time = None
	layer_move_pattern = re.compile("^G[0-3]\s")
	filament_change_pattern = re.compile("^(T[0-9]+|M600)")
	filament_change_array = []
	current_move = 0
	total_moves = 0
	next_change = 0
	layer_move_array = []
	layer_moves = 0
	layer_progress = 0
	last_layer_duration = 0
	average_layer_duration = 0
	current_height = 0.0
	current_feedrate = 0.0
	avg_feedrate = 0.0
	feed_avg_start = 0.0
	last_feed_change = 0.0
	fan_speed_pattern = re.compile("^M106.* S(\d+\.?\d*).*")
	fan_speed = 0.0
	# Gcode metadata:
	total_layers = 0
	current_layer = 0
	max_x = 0.0
	max_y = 0.0
	max_z = 0.0
	min_x = 0.0
	min_y = 0.0
	min_z = 0.0
	depth = 0.0
	height = 0.0
	width = 0.0
	estimated_print_time = 0.0
	average_print_time = 0.0
	last_print_time = 0.0

	moves_to_update_progress = 10


	if noAccessPermissions == False:
		def get_additional_permissions(*args, **kwargs):
			return [
				dict(key="ADMIN",
					name="Admin access",
					description="Allows modifying or adding shell commands",
					roles=["admin"],
					dangerous=True,
					default_groups=[ADMIN_GROUP])
			]

	def psUtilGetStats(self):
		if platform.system() == "Linux":
			temp_sum = 0
			thermal = psutil.sensors_temperatures(fahrenheit=False)
			if "cpu-thermal" in thermal: # RPi
				self.cpu_temp = int(round((thermal["cpu-thermal"][0][1])))
			elif "cpu_thermal" in thermal: # RPi Alternative
				self.cpu_temp = int(round((thermal["cpu_thermal"][0][1])))
			elif 'soc_thermal' in thermal: #BananaPi
				self.cpu_temp=int(round(float(thermal['soc_thermal'][0][1])*1000))
			elif 'coretemp' in thermal: # Intel
				for temp in range(0,len(thermal["coretemp"]),1):
					temp_sum = temp_sum+thermal["coretemp"][temp][1]
				self.cpu_temp = int(round(temp_sum / len(thermal["coretemp"])))
			elif 'w1_slave_temp' in thermal: #Dallas temp sensor fix
				tempFile = open("/sys/class/thermal/thermal_zone0/temp")
				cpu_val = tempFile.read()
				tempFile.close()
				self.cpu_temp = int(round(float(cpu_val)/1000))
			self.cpu_percent = str(psutil.cpu_percent(interval=None, percpu=False))
			self.cpu_freq = str(int(round(psutil.cpu_freq(percpu=False).current, 0)))
			self.virtual_memory_percent = str(psutil.virtual_memory().percent)
			self.disk_usage = str(psutil.disk_usage("/").percent)

			psutilMsg = dict(
			cpuPercent=str(self.cpu_percent),
			virtualMemPercent=str(self.virtual_memory_percent),
			diskUsagePercent=str(self.disk_usage),
			cpuTemp=str(self.cpu_temp),
			cpuFreq=str(self.cpu_freq)
			)
			self._plugin_manager.send_plugin_message(self._identifier, psutilmSg)

	def runCmd(self, cmdIndex):
		cmd = self.cmd_commands[cmdIndex].get("command")

		interval = float(self.cmd_commands[cmdIndex].get("interval"))

		process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)

		if (sys.version_info >= (3, 3)):
			try:
				stdout, stderr = process.communicate(timeout=interval)
			except subprocess.TimeoutExpired:
				process.kill()
				self._logger.warn("cmd widget \"{0}\" ran for too long".format(cmd))
				stdout, stderr = process.communicate()
		else:
			stdout, stderr = process.communicate()

		if (sys.version_info > (3, 5)):
			# Python 3.5
			result = stdout.strip().decode('ascii')
			error = stderr.strip().decode('ascii')
		else:
			# Python 2
			result = stdout.strip()
			error = stderr.strip()

		if (error != ""):
			self._logger.warn("cmd widget ran with error: " + error)

		results = {"index": cmdIndex, "result": result}

		self._plugin_manager.send_plugin_message(self._identifier, dict(cmdResults=json.dumps(results)))

	def testCmd(self, cmd):
		process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)

		if (sys.version_info >= (3, 3)):
			try:
				stdout, stderr = process.communicate(timeout=10.0)
			except subprocess.TimeoutExpired:
				process.kill()
				self._logger.warn("cmd widget test \"{0}\" ran for too long".format(cmd))
				stdout, stderr = process.communicate()
		else:
			stdout, stderr = process.communicate()

		if (sys.version_info > (3, 5)):
			# Python 3.5
			result = stdout.strip().decode('ascii') + stderr.strip().decode('ascii')
		else:
			# Python 2
			result = stdout.strip() + stderr.strip()

		results = {"result": result}

		self._plugin_manager.send_plugin_message(self._identifier, dict(cmdTest=json.dumps(results)))

	def updateCmds(self):
		for timer in self.cmd_timers:
			timer.cancel()

		del self.cmd_timers[:]

		if (self._settings.get_boolean(['showCommandWidgets'])):
			index = 0
			for command in self.cmd_commands:
				if (command.get("enabled")):

					t = RepeatedTimer(float(command.get("interval")), self.runCmd, [index], run_first=True)
					t.start()
					self.cmd_timers.append(t)

				index += 1

	##~~ SimpleApiPlugin mixin
	def get_api_commands(self):
		return dict(
			testCmdWidget=["cmd"]
		)

	def on_api_command(self, command, data):
		if command == "testCmdWidget":
			if (noAccessPermissions or Permissions.PLUGIN_DASHBOARD_ADMIN.can()):
				self._logger.info("testCmdWidget called, cmd is {cmd}".format(**data))
				self.testCmd(data["cmd"])
			else:
				self._logger.info("testCmdWidget called, but without proper permissions")

	# ~~ StartupPlugin mixin
	def on_after_startup(self):
		self._logger.info("Dashboard started")
		if (sys.version_info > (3, 5)): # Detect and set python version
			self.python_version = 3
		else:
			self.python_version = 2

		# Build self.layer_indicator_patterns from settings
		self.layer_indicator_config = self._settings.get(["layerIndicatorArray"])
		for layer_indicator in self.layer_indicator_config:
			self.layer_indicator_patterns.append(re.compile(layer_indicator.get("regx")))

		self.cmd_commands = self._settings.get(["commandWidgetArray"])

		if (self._settings.get_boolean(["showSystemInfo"])):
			self.psuTimer = RepeatedTimer(3.0, self.psUtilGetStats)
			self.psuTimer.daemon = True
			self.psuTimer.start()

		self.updateCmds()

		self.timelyTimer = RepeatedTimer(1.0, self.timely_notification, run_first=True)
		self.timelyTimer.start()

	def timely_notification(self):
		msg = dict(
			currentMove=str(self.current_move)
		)

	def connect_notification(self):
		msg = dict(
			cpuPercent=str(self.cpu_percent),
			virtualMemPercent=str(self.virtual_memory_percent),
			diskUsagePercent=str(self.disk_usage),
			cpuTemp=str(self.cpu_temp),
			cpuFreq=str(self.cpu_freq),
			extrudedFilament=str( round(self.extruded_filament_store + self.extruded_filament / 1000, 2)),
			layerTimes=str(self.layer_times),
			layerLabels=str(self.layer_labels),
			printerMessage=str(self.printer_message),
			totalLayers=str(self.total_layers),
			currentLayer=str(self.current_layer),
			maxX=str(self.max_x),
			maxY=str(self.max_y),
			maxZ=str(self.max_z), #Total height
			minX=str(self.min_x),
			minY=str(self.min_y),
			minZ=str(self.min_z),
			depth=str(self.depth),
			height=str(self.height),
			width=str(self.width),
			estimatedPrintTime=str(self.estimated_print_time),
			averagePrintTime=str(self.average_print_time),
			lastPrintTime=str(self.last_print_time),
			lastLayerDuration=str(self.last_layer_duration),
			averageLayerDuration=str(self.average_layer_duration),
			layerProgress=str(self.layer_progress),
			averageLayerTimes=str(self.average_layer_times),
			fanSpeed=str(self.fan_speed),
			currentHeight=str(self.current_height),
			currentMove=str(self.current_move),
			totalMoves=str(self.total_moves),
			nextChange=self.next_change_func()
		)
		self._plugin_manager.send_plugin_message(self._identifier, msg)

	def unload_preprocesser(self, payload):
		self.gcode_preprocessor.layer_move_array.append(self.gcode_preprocessor.layer_moves)
		self.gcode_preprocessor.layer_count += 1

		#Store the total_layer_count and layer_move_array in the file metadata once all analysis is finished
		self._logger.info("GcodePreProcessor found layers: " + str(self.gcode_preprocessor.layer_count))
		self._logger.info("GcodePreProcessor found filament changes: " + str(len(self.gcode_preprocessor.filament_change_array)))
		self._logger.info("GcodePreProcessor saving layer count in file metadata")
		additionalMetaData = {"layer_move_array": json.dumps(self.gcode_preprocessor.layer_move_array), "filament_change_array": json.dumps(self.gcode_preprocessor.filament_change_array)}
		self._file_manager.set_additional_metadata(payload.get("origin"), payload.get("name"), self._plugin_info.key, additionalMetaData, overwrite=True)

		self.gcode_preprocessor.meta_ed = True

	def load_from_meta(self, payload):
			#Reset vars
			self.layer_start_time = None
			self.last_layer_duration = 0
			self.average_layer_duration = 0
			self.current_layer = 0
			self.current_height = 0.0
			self.fan_speed = 0.0
			self.layer_moves = 0
			self.layer_progress = 0
			self.total_layers = 0
			self.total_moves = 0
			self.current_move = 0
			self.is_preprocessed = False
			self.next_change = 0
			del self.layer_times[:]
			del self.average_layer_times[:]
			del self.layer_labels[:]
			del self.layer_move_array[:]
			self.extruded_filament = 0.0
			self.extruded_filament_store = 0.0

			metaData = self._file_manager.get_metadata(payload.get("origin"), payload.get("path")) # Get OP metadata from file
			#self._logger.info("Metadata: " + json.dumps(metaData, indent=4))

			try:
				self.layer_move_array = json.loads(metaData['dashboard']['layer_move_array'])
				self.total_layers = len(self.layer_move_array)
				self.total_moves = sum(self.layer_move_array)
			except KeyError: pass
			try: self.filament_change_array = json.loads(metaData['dashboard']['filament_change_array'])
			except KeyError: pass
			try: self.max_x = str(metaData['analysis']['printingArea']['maxX'])
			except KeyError: pass
			try: self.max_y = str(metaData['analysis']['printingArea']['maxy'])
			except KeyError: pass
			try: self.max_z = str(metaData['analysis']['printingArea']['maxZ'])
			except KeyError: pass
			try: self.min_x = str(metaData['analysis']['printingArea']['minX'])
			except KeyError: pass
			try: self.min_y = str(metaData['analysis']['printingArea']['minY'])
			except KeyError: pass
			try: self.min_z = str(metaData['analysis']['printingArea']['minZ'])
			except KeyError: pass
			try: self.depth = str(metaData['analysis']['dimensions']['depth'])
			except KeyError: pass
			try: self.height = str(metaData['analysis']['dimensions']['height'])
			except KeyError: pass
			try: self.width = str(metaData['analysis']['dimensions']['width'])
			except KeyError: pass
			try: self.estimated_print_time = str(metaData['analysis']['estimatedPrintTime'])
			except KeyError: pass
			try: self.average_print_time = str(metaData['statistics']['averagePrintTime'])
			except KeyError: pass
			try: self.last_print_time = str(metaData['statistics']['lastPrintTime'])
			except KeyError: pass

			self._logger.info("Total Layers " + str(self.total_layers))
			if int(self.total_layers) > 0:
				self.is_preprocessed = True
			else:
				if payload['origin'] == 'local':
					self._logger.info("Gcode not pre-processed by Dashboard. Processing now.")

					path = self._file_manager.path_on_disk(FileDestinations.LOCAL, payload['path'])
					file_object = octoprint.filemanager.util.DiskFileWrapper(payload['name'], path)
					stream = self.createFilePreProcessor(path, file_object)
					stream.save(path)
					self._logger.info("Gcode pre-processing done.")
					self.unload_preprocesser(payload)
					self.load_from_meta(payload)
					return
				else:
					self._logger.warn("Gcode not pre-processed by Dashboard. Upload again to get layer metrics")

			# if (self._settings.get(['clearOn_Feedrate']) == 1):
			self.current_feedrate = 0.0
			self.avg_feedrate = 0.0
			self.feed_avg_start = time.time()
			self.last_feed_change = time.time()

			startMsg = dict(
					printStarted="True",
					isPreprocessed=str(self.is_preprocessed),
					maxX=str(self.max_x),
					maxY=str(self.max_y),
					maxZ=str(self.max_z), #Total height
					minX=str(self.min_x),
					minY=str(self.min_y),
					minZ=str(self.min_z),
					depth=str(self.depth),
					height=str(self.height),
					width=str(self.width),
					estimatedPrintTime=str(self.estimated_print_time),
					averagePrintTime=str(self.average_print_time),
					lastPrintTime=str(self.last_print_time),
					totalMoves=str(self.total_moves),
					currentMove=str(self.current_move),
					nextChange=self.next_change_func(),
					totalLayers=str(self.total_layers)
				)
			self._plugin_manager.send_plugin_message(self._identifier, startMsg)

	def print_ended(self):
		if (self._settings.get(['clearOn_Feedrate']) == 2):
			self.current_feedrate = 0.0
			self.avg_feedrate = 0.0
			self.feed_avg_start = time.time()
			self.last_feed_change = time.time()

		endMsg = dict(
				printEnd="True"
			)
		self._plugin_manager.send_plugin_message(self._identifier, endMsg)

	def on_event(self, event, payload):
		if event == Events.METADATA_ANALYSIS_FINISHED and self.gcode_preprocessor and not self.gcode_preprocessor.meta_ed:
			self.unload_preprocesser(payload)
		elif event == Events.PRINT_STARTED:
			self.load_from_meta(payload)
		elif event == Events.PRINT_DONE or event == Events.PRINT_FAILED or event == Events.PRINT_CANCELLED:
			self.print_ended()
		elif event == Events.CLIENT_AUTHED:
			self.connect_notification()

	##~~ SettingsPlugin mixin
	def get_settings_defaults(self):
		# settings defaults
		return dict(
			# progress gauges
			gaugetype="circle",
			# temp gagues
			hotendTempMax="300",
			bedTempMax="100",
			chamberTempMax="50",
			temperatureTicks="0",
			hideHotend=False,
			showTempGaugeColors=False,
			targetTempDeviation="10",
			# dlp
			supressDlpWarning=False,
			# show fullscreen and fullbrowser buttons
			showFullscreen=True,
			# layer graph
			layerGraphType="normal",
			# cpu temps
			cpuTempWarningThreshold="70",
			cpuTempCriticalThreshold="85",
			# theme color
			useThemeifyColor=True,
			fullscreenUseThemeColors=False,
			# command widgets
			commandWidgetArray=[dict(
					icon='command-icon.png',
					name='Default',
					command="echo 9V",
					enabled=False,
					interval="10",
					type="text"),
					dict(
					icon='chamber-icon.png',
					name='Remote Chamber',
					# TODO: Change/delete this
					command='echo "scale=1; ($(curl -s http://greenhome.local/data/data.json | jq `.[-1].temp`) -32) / 1.8" | bc',
					enabled=True,
					interval="60",
					type="3/4")
					],
			# webcams
			disableWebcamNonce=False,
			enableDashMultiCam=False,
			_webcamArray=[dict(
				name='Default',
				url=octoprint.settings.settings().get(["webcam","stream"]),
				flipV=octoprint.settings.settings().get(["webcam","flipV"]),
				flipH=octoprint.settings.settings().get(["webcam","flipH"]),
				rotate=octoprint.settings.settings().get(["webcam","rotate90"]),
				disableNonce=False,
				streamRatio=octoprint.settings.settings().get(["webcam","streamRatio"]),
				)],
			layerIndicatorArray=[
				dict(slicer='CURA',
					regx='^;LAYER:([0-9]+)'),
				dict(slicer='Simplify3D',
					regx='^; layer ([0-9]+)'),
				dict(slicer='Slic3r/PrusaSlicer',
					regx='^;BEFORE_LAYER_CHANGE'),
				dict(slicer='Almost Everyone',
					regx="^;(( BEGIN_|BEFORE_)+LAYER_(CHANGE|OBJECT)|LAYER:[0-9]+| [<]{0,1}layer [0-9]+[>,]{0,1}).*$")
			],
			defaultWebcam=0,
			# overlay dashboard over the webcam in fullscreen
			dashboardOverlayFull=False,
			# visibility of widgets
			showFan=True,
			showWebCam=False,
			showSystemInfo=False,
			showProgress=True,
			showTimeProgress=True,
			showLayerProgress=False,
			showHeightProgress=False,
			showFilament=True,
			showFilamentChangeTime=True,
			showLayerGraph=False,
			showPrinterMessage=False,
			showSensorInfo=False,
			showJobControlButtons=False,
			showFeedrate=False,
			showCommandWidgets=False,
			enableTempGauges=True,
			# show the widgets in full screen
			fsSystemInfo=True,
			fsJobControlButtons=False,
			fsTempGauges=True,
			fsFan=True,
			fsSensorInfo=True,
			fsCommandWidgets=True,
			fsPrinterMessage=True,
			fsProgressGauges=True,
			fsLayerGraph=False,
			fsFilament=True,
			fsFeedrate=True,
			fsWebCam=True,
			# printingOnly: False = shown when printing or not printing, True = shown only when printing
			printingOnly_SystemInfo=False,
			printingOnly_JobControlButtons=False,
			printingOnly_TempGauges=False,
			printingOnly_Fan=False,
			printingOnly_SensorInfo=False,
			printingOnly_CommandWidgets=False,
			printingOnly_PrinterMessage=True,
			printingOnly_ProgressGauges=True,
			printingOnly_LayerGraph=True,
			printingOnly_Filament=True,
			printingOnly_Feedrate=True,
			printingOnly_WebCam=False,
			# clearOn: when to clear data for some of the widgets, 0 = never cleared, 1 = clear on print start, 2 = clear on print end
			clearOn_PrinterMessage=2,
			clearOn_ProgressGauges=2, # not implemented
			clearOn_LayerGraph=2,
			clearOn_Filament=2,
			clearOn_Feedrate=2,
			# max value of feedrate gauge
			feedrateMax=400,
			# time format for eta
			ETAUse12HTime=False,
			ETAShowSeconds=True
		)

	def get_settings_restricted_paths(self):
		return dict(
			user=[["_webcamArray",], ["commandWidgetArray",]]
		)

	def on_settings_migrate(self, target, current):
		# convert to version 1 (i.e. add enabled and interval)
		if (current == None or current < 1):
			tmpCmdArray = self._settings.get(["commandWidgetArray"])
			for cmd in tmpCmdArray:
				if not('enabled' in cmd):
					cmd['enabled'] = False
				if not('interval' in cmd):
					cmd['interval'] = 10
			self._settings.set(["commandWidgetArray"], tmpCmdArray)
			self._settings.save()

		# convert to version 2 (i.e. add widget type)
		if (current < 2):
			tmpCmdArray = self._settings.get(["commandWidgetArray"])
			for cmd in tmpCmdArray:
				if not('type' in cmd):
					cmd['type'] = "text"
			self._settings.set(["commandWidgetArray"], tmpCmdArray)
			self._settings.save()

	def get_settings_version(self):
		return 2

	def on_settings_save(self, data):
		if (noAccessPermissions == False and Permissions.PLUGIN_DASHBOARD_ADMIN.can() == False):
			try:
				del data['commandWidgetArray']
			except:
				pass
		#self._logger.info(str(data))
		octoprint.plugin.SettingsPlugin.on_settings_save(self, data)

		self.cmd_commands = self._settings.get(["commandWidgetArray"])
		self.updateCmds()

		if (self.psuTimer):
			self.psuTimer.cancel()

		if (self._settings.get_boolean(["showSystemInfo"])):
			self.psuTimer = RepeatedTimer(3.0, self.psUtilGetStats)
			self.psuTimer.daemon = True
			self.psuTimer.start()


	def get_template_configs(self):
		return [
			dict(type="tab", custom_bindings=True),
			dict(type="settings", custom_bindings=True)
			]

	##~~ AssetPlugin mixin
	def get_assets(self):
		return dict(
			js=["js/dashboard.js", "js/chartist.min.js", "js/fitty.min.js"],
			css=["css/dashboard.css", "css/chartist.min.css"],
			less=["less/dashboard.less"]
		)

	##~~ Softwareupdate hook
	def get_update_information(self):
		return dict(
			dashboard=dict(
				displayName="Dashboard Plugin",
				displayVersion=self._plugin_version,

				# version check: github repository
				type="github_release",
				user="j7126",
				repo="OctoPrint-Dashboard",
				current=self._plugin_version,

				stable_branch=dict(
					name="Stable",
					branch="master",
					comittish=["master"],
				),

				prerelease_branches=[
					{
					"name": "Release Candidate",
					"branch": "rc",
					"comittish": ["rc", "master"]
					}
				],

				# update method: pip
				pip="https://github.com/j7126/OctoPrint-Dashboard/archive/{target_version}.zip"
			)
		)

	def next_change_func(self):
		if self.next_change < len(self.filament_change_array):
			return(str(self.filament_change_array[self.next_change]))
		else:
			return("-")

	def process_gcode(self, comm_instance, phase, cmd, cmd_type, gcode, *args, **kwargs):
		if not gcode:
			return

		elif gcode in ("M117"):
			if cmd.startswith("M117 DASHBOARD_LAYER_INDICATOR"):	# Own layer indicator from pre-processor. Strip command.
				self.current_layer = int(cmd.replace("M117 DASHBOARD_LAYER_INDICATOR ", ""))
				self.layer_moves = 0
				self.layer_progress = 0

				#Calc layer duration
				if self.layer_start_time is not None: # We need to get to the second layer before calculating the previous layer duration
					self.last_layer_duration = int(round((datetime.now() - self.layer_start_time).total_seconds()))
					# Update the layer graph data:
					self.layer_times.append(self.last_layer_duration)
					self.layer_labels.append(self.current_layer - 1)
					self.average_layer_duration = int(round(sum(self.layer_times) / len(self.layer_times)))
					self.average_layer_times.append(self.average_layer_duration)

				self.layer_start_time = datetime.now()
				msg = dict(
					currentLayer=str(self.current_layer),
					lastLayerDuration=str(self.last_layer_duration),
					averageLayerDuration=str(self.average_layer_duration),
					layerLabels=str(self.layer_labels),
					layerTimes=str(self.layer_times),
					averageLayerTimes=str(self.average_layer_times)
				)
				self._plugin_manager.send_plugin_message(self._identifier, msg)

				return [] # Remove the Layer Indicator
			else:
				self.printer_message = cmd.replace("M117 ", "")
				self._plugin_manager.send_plugin_message(self._identifier, dict(printerMessage=self.printer_message))


		elif gcode in ("M106"): # Set fan speed
			matched = self.fan_speed_pattern.match(cmd.upper())
			if matched:
				self.fan_speed = float(matched.group(1)) * 100.0 / 255.0 #get percent
				msg = dict(
					fanSpeed=str(self.fan_speed)
				)
				self._plugin_manager.send_plugin_message(self._identifier, msg)

		elif gcode in ("M107"): # Turn fan off
			self.fan_speed = 0.0
			msg = dict(
				fanSpeed=str(self.fan_speed)
			)
			self._plugin_manager.send_plugin_message(self._identifier, msg)

		elif gcode in ("M82", "G90"):
			self.extruder_mode = "absolute"

		elif gcode in ("M83", "G91"):
			self.extruder_mode = "relative"

		elif gcode in ("G92"): # Extruder Reset
			if self.extruder_mode == "absolute":
				self.extruded_filament_store += self.extruded_filament
			else: return

		elif gcode in ("G0", "G1", "G2", "G3"):
			msg = {}

			self.current_move += 1
			self.layer_moves += 1
			if self.current_layer >= 0 and self.total_layers > 0 and len(self.layer_move_array) > 0 : # Avoid moves prior to the first layer and un-preprocessed gcode files.
				current_layer_progress = int((self.layer_moves / self.layer_move_array[self.current_layer]) * 100)
				if self.layer_moves % self.moves_to_update_progress == 0: # Update the in, layer progress a reasonable amount
					self.layer_progress = current_layer_progress

					msg.update(dict(
						layerProgress=str(self.layer_progress),
						currentMove=str(self.current_move)
					))


			CmdDict = dict ((x,float(y)) for d,x,y in (re.split('([A-Z])', i) for i in cmd.upper().split()))
			if "E" in CmdDict:
				e = float(CmdDict["E"])
				if self.extruder_mode == "absolute":
					if e > self.extruded_filament + 100:
						self.extruded_filament = e
						msg.update(dict(
							extrudedFilament=str( round( (self.extruded_filament_store + self.extruded_filament) / 1000, 2) )
						))
				elif self.extruder_mode == "relative":
					if e > 100:
						self.extruded_filament += e
						msg.update(dict(
							extrudedFilament=str( round( (self.extruded_filament_store + self.extruded_filament) / 1000, 2) )
						))
					elif e > 0:
						self.extruded_filament += e
				else: return

			if "Z" in CmdDict:
				self.current_height = float(CmdDict["Z"])
				msg.update(dict(
					currentHeight=str(self.current_height)
				))
			if "F" in CmdDict:
				now = time.time()

				# update the time weighted avg of feedrate
				self.avg_feedrate = ( self.avg_feedrate*(self.last_feed_change-self.feed_avg_start) + self.current_feedrate * (now - self.last_feed_change) ) / (now-self.feed_avg_start)

				self.last_feed_change = now
				self.current_feedrate = float(CmdDict["F"]) / 60 ##convert from mm/m to mm/s
				msg.update(dict(
					currentFeedrate=self.current_feedrate,
					avgFeedrate=self.avg_feedrate,
					lastFeedChange=self.last_feed_change
				))

			if len(msg) > 0:
				self._plugin_manager.send_plugin_message(self._identifier, msg)
		elif gcode == "M106" or gcode[0] == "T":
			self.next_change += 1

			msg = dict(
				currentMove=str(self.current_move),
				nextChange=self.next_change_func()
			)

			self._plugin_manager.send_plugin_message(self._identifier, msg)


		else:
			return

	def createFilePreProcessor(self, path, file_object, blinks=None, printer_profile=None, allow_overwrite=True, *args, **kwargs):

		fileName = file_object.filename
		if not octoprint.filemanager.valid_file_type(fileName, type="gcode"):
			return file_object
		fileStream = file_object.stream()
		self._logger.info("GcodePreProcessor started processing.")
		self.gcode_preprocessor = GcodePreProcessor(fileStream, self.layer_indicator_patterns, self.layer_move_pattern, self.filament_change_pattern, self.python_version, self._logger)
		return octoprint.filemanager.util.StreamWrapper(fileName, self.gcode_preprocessor)


__plugin_name__ = "Dashboard"
__plugin_pythoncompat__ = ">=2.7,<4"

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = DashboardPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
		"octoprint.comm.protocol.gcode.sending": __plugin_implementation__.process_gcode,
		"octoprint.filemanager.preprocessor": __plugin_implementation__.createFilePreProcessor
	}
	if noAccessPermissions == False:
		__plugin_hooks__["octoprint.access.permissions"] = __plugin_implementation__.get_additional_permissions


	global __plugin_settings_overlay__
	__plugin_settings_overlay__ = dict(appearance=dict(components=dict(order=dict(tab=["plugin_dashboard",
																						"temperature",
																						"control",
																						"gcodeviewer",
																						"terminal",
																						"timelapse"]))))
