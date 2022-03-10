# coding=utf-8
from __future__ import absolute_import, unicode_literals
import sys
import re
import platform
import json
import subprocess
from datetime import timedelta
from datetime import datetime
from collections import deque
import psutil
from flask import make_response, render_template
import octoprint.plugin
from octoprint.util import RepeatedTimer, ResettableTimer
import octoprint.filemanager
import octoprint.filemanager.util
import octoprint.util
from octoprint.events import Events
try:
    from octoprint.access import ADMIN_GROUP
    from octoprint.access.permissions import Permissions
    ACCESS_PERMISSIONS_AVAILABLE = True
except ImportError:
    ACCESS_PERMISSIONS_AVAILABLE = False

from octoprint_dashboard.gcode_processor import GcodePreProcessor
from octoprint_dashboard.http_status_codes import HttpStatusCodes
from octoprint_dashboard.theme import DEFAULT_THEME


class DashboardPlugin(octoprint.plugin.SettingsPlugin,
                      octoprint.plugin.StartupPlugin,
                      octoprint.plugin.AssetPlugin,
                      octoprint.plugin.TemplatePlugin,
                      octoprint.plugin.UiPlugin,
                      octoprint.plugin.EventHandlerPlugin):
    """
    Dashboard Plugin
    """
    _plugin_info = None

    # data
    printer_message = ""
    extruded_filament = 0.0
    extruded_filament_arr = []
    extruder_mode = ""
    cpu_percent = 0
    cpu_temp = 0
    cpu_freq = 0
    virtual_memory_percent = 0
    disk_usage = 0
    layer_times = []
    average_layer_times = []
    layer_labels = []
    cmd_commands = []
    cmd_results = []
    python_version = 0
    is_preprocessed = False
    gcode_preprocessor = None
    layer_indicator_config = []
    layer_indicator_patterns = []
    layer_start_time = None
    layer_move_pattern = re.compile(r"^G[0-1]\s")
    layer_move_array = []
    layer_moves = 0
    layer_progress = 0
    last_layer_duration = 0
    average_layer_duration = 0
    current_height = 0.0
    current_feedrate = 0.0
    average_feedrates = deque([], maxlen=10)  # Last 10 moves
    average_feedrate = 0.0
    fan_speed_pattern = re.compile(r"^M106.* S(\d+\.?\d*).*")
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

    def ps_util_get_stats(self):
        """
        Gets system stats using psutil
        sets cpu_temp, cpu_percent, cpu_freq, virtual_memory_percent and disk_usage
        """
        if platform.system() == "Linux":
            temp_sum = 0
            thermal = psutil.sensors_temperatures(fahrenheit=False)
            if "cpu-thermal" in thermal:  # RPi
                self.cpu_temp = int(round((thermal["cpu-thermal"][0][1])))
            elif "cpu_thermal" in thermal:  # RPi Alternative
                self.cpu_temp = int(round((thermal["cpu_thermal"][0][1])))
            elif 'soc_thermal' in thermal:  # BananaPi
                self.cpu_temp = int(
                    round(float(thermal['soc_thermal'][0][1])*1000))
            elif 'coretemp' in thermal:  # Intel
                for temp in range(0, len(thermal["coretemp"]), 1):
                    temp_sum = temp_sum+thermal["coretemp"][temp][1]
                self.cpu_temp = int(round(temp_sum / len(thermal["coretemp"])))
            elif 'w1_slave_temp' in thermal:  # Dallas temp sensor fix
                with open('/sys/class/thermal/thermal_zone0/temp') as temp_file:
                    cpu_val = temp_file.read()
                    self.cpu_temp = int(round(float(cpu_val)/1000))
            self.cpu_percent = str(
                psutil.cpu_percent(interval=None, percpu=False))
            self.cpu_freq = str(
                int(round(psutil.cpu_freq(percpu=False).current, 0)))
            self.virtual_memory_percent = str(psutil.virtual_memory().percent)
            self.disk_usage = str(psutil.disk_usage("/").percent)
        # repeat this function every 3 seconds
        timer = ResettableTimer(3.0, self.ps_util_get_stats)
        timer.daemon = True
        timer.start()

    def cmd_get_stats(self, do_timer=True):
        """
        Run command widgets
        """
        del self.cmd_results[:]
        for command in self.cmd_commands:
            process = subprocess.Popen(command.get(
                "command"), stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
            stdout, stderr = process.communicate()
            if self.python_version == 3:  # Python 3.5
                result = stdout.strip().decode('ascii') + stderr.strip().decode('ascii')
            else:  # Python 2
                result = stdout.strip() + stderr.strip()
            self.cmd_results.append(result)
        self._plugin_manager.send_plugin_message(
            self._identifier, dict(cmdResults=json.dumps(self.cmd_results)))
        if do_timer:
            timer = ResettableTimer(60.0, self.cmd_get_stats)
            timer.daemon = True
            timer.start()

    def send_notifications(self):
        """
        Send stats to the frontend
        """
        msg = dict(
            updateReason="timer",
            cpuPercent=str(self.cpu_percent),
            virtualMemPercent=str(self.virtual_memory_percent),
            diskUsagePercent=str(self.disk_usage),
            cpuTemp=str(self.cpu_temp),
            cpuFreq=str(self.cpu_freq),
            extrudedFilament=str(
                round((sum(self.extruded_filament_arr) + self.extruded_filament) / 1000, 2)),
            layerTimes=str(self.layer_times),
            layerLabels=str(self.layer_labels),
            printerMessage=str(self.printer_message),
            cmdResults=json.dumps(self.cmd_results),
            totalLayers=str(self.total_layers),
            currentLayer=str(self.current_layer),
            maxX=str(self.max_x),
            maxY=str(self.max_y),
            maxZ=str(self.max_z),  # Total height
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
            currentHeight=str(self.current_height)
        )
        self._plugin_manager.send_plugin_message(self._identifier, msg)

    # ~~ Mixins ~~

    def will_handle_ui(self, request):
        return "dashboard" in request.args

    def on_ui_render(self, now, request, render_kwargs):
        res = None
        theme_data = self._settings.get(["themeData"])
        if "primary" not in theme_data or not re.search(r'^#(?:[0-9a-fA-F]{3}){1,2}$', theme_data["primary"]):
            theme_data["primary"] = DEFAULT_THEME["primary"]
        if "secondary" not in theme_data or not re.search(r'^#(?:[0-9a-fA-F]{3}){1,2}$', theme_data["secondary"]):
            theme_data["secondary"] = DEFAULT_THEME["secondary"]

        instance_name = octoprint.settings.settings().get(["appearance", "name"])

        try:
            res = make_response(render_template(
                "dashboard_index.jinja2",
                **render_kwargs,
                themeData=theme_data,
                instanceName=instance_name
            ))
        except Exception as error:
            self._logger.error(f'Error rendering template {error}')
            res = make_response(render_template(
                "dashboard_error.jinja2", httpStatusCodes=HttpStatusCodes, statusCode=500))
        return res

    def on_after_startup(self):
        self._logger.info("Dashboard started")
        if sys.version_info > (3, 5):  # Detect and set python version
            self.python_version = 3
        else:
            self.python_version = 2

        # Build self.layer_indicator_patterns from settings
        self.layer_indicator_config = self._settings.get(["layerIndicatorArray"])
        for layer_indicator in self.layer_indicator_config:
            self.layer_indicator_patterns.append(re.compile(layer_indicator.get("regx")))

        self.cmd_commands = self._settings.get(["commandWidgetArray"])
        self.ps_util_get_stats()
        self.cmd_get_stats()
        notifications_timer = RepeatedTimer(3.0, self.send_notifications, run_first=True)
        notifications_timer.start()

    def on_event(self, event, payload):
        if event == Events.METADATA_ANALYSIS_FINISHED:
            # Store the total_layer_count and layer_move_array in the file metadata once all analysis is finished
            self._logger.info("GcodePreProcessor found layers: " + str(self.gcode_preprocessor.total_layer_count))
            self._logger.info("GcodePreProcessor saving layer count in file metadata")
            additional_metadata = {
                "total_layer_count": str(self.gcode_preprocessor.total_layer_count),
                "layer_move_array": json.dumps(self.gcode_preprocessor.layer_move_array)
            }
            self._file_manager.set_additional_metadata(
                payload.get("origin"),
                payload.get("name"),
                self._plugin_info.key,
                additional_metadata,
                overwrite=True
            )

        if event == Events.PRINT_STARTED:
            # Reset vars
            self.layer_start_time = None
            self.last_layer_duration = 0
            self.average_layer_duration = 0
            self.current_height = 0.0
            self.current_feedrate = 0.0
            self.fan_speed = 0.0
            self.layer_moves = 0
            self.layer_progress = 0
            self.average_feedrates = deque([], maxlen=10)
            self.total_layers = 0
            self.is_preprocessed = False
            del self.layer_times[:]
            del self.average_layer_times[:]
            del self.layer_labels[:]
            del self.layer_move_array[:]
            self. extruded_filament = 0.0
            del self.extruded_filament_arr[:]

            # Get metadata from file
            metadata = self._file_manager.get_metadata(
                payload.get("origin"),
                payload.get("path")
            )

            try:
                self.total_layers = metadata['dashboard']['total_layer_count']
            except KeyError:
                pass
            try:
                self.layer_move_array = json.loads(metadata['dashboard']['layer_move_array'])
            except KeyError:
                pass
            try:
                self.max_x = str(metadata['analysis']['printingArea']['maxX'])
            except KeyError:
                pass
            try:
                self.max_y = str(metadata['analysis']['printingArea']['maxy'])
            except KeyError:
                pass
            try:
                self.max_z = str(metadata['analysis']['printingArea']['maxZ'])
            except KeyError:
                pass
            try:
                self.min_x = str(metadata['analysis']['printingArea']['minX'])
            except KeyError:
                pass
            try:
                self.min_y = str(metadata['analysis']['printingArea']['minY'])
            except KeyError:
                pass
            try:
                self.min_z = str(metadata['analysis']['printingArea']['minZ'])
            except KeyError:
                pass
            try:
                self.depth = str(metadata['analysis']['dimensions']['depth'])
            except KeyError:
                pass
            try:
                self.height = str(metadata['analysis']['dimensions']['height'])
            except KeyError:
                pass
            try:
                self.width = str(metadata['analysis']['dimensions']['width'])
            except KeyError:
                pass
            try:
                self.estimated_print_time = str(
                    metadata['analysis']['estimatedPrintTime'])
            except KeyError:
                pass
            try:
                self.average_print_time = str(
                    metadata['statistics']['averagePrintTime'])
            except KeyError:
                pass
            try:
                self.last_print_time = str(
                    metadata['statistics']['averagePrintTime'])
            except KeyError:
                pass

            if int(self.total_layers) > 0:
                self.is_preprocessed = True
            else:
                self._logger.warn("Gcode not pre-processed by Dashboard. Upload again to get layer metrics")

            msg = dict(
                printStarted="True",
                isPreprocessed=str(self.is_preprocessed)
            )
            self._plugin_manager.send_plugin_message(self._identifier, msg)

    def get_settings_defaults(self):
        return dict(
            # new settings v2
            themeData=DEFAULT_THEME,
            outlinedStyleWidgets=False,
            reducedAnimations=False,
            autoSaveSettings=False,
            # old settings v1, TODO: needs to be cleaned up
            gaugetype="circle",
            fullscreenUseThemeColors=False,
            hotendTempMax="300",
            bedTempMax="100",
            chamberTempMax="50",
            showFan=True,
            showWebCam=False,
            showSystemInfo=False,
            showProgress=True,
            showTimeProgress=True,
            showLayerProgress=False,
            hideHotend=False,
            supressDlpWarning=False,
            showFullscreen=True,
            showFilament=True,
            showFilamentChangeTime=True,
            showLayerGraph=False,
            layerGraphType="normal",
            showPrinterMessage=False,
            showSensorInfo=False,
            showJobControlButtons=False,
            cpuTempWarningThreshold="70",
            cpuTempCriticalThreshold="85",
            showTempGaugeColors=False,
            enableTempGauges=True,
            targetTempDeviation="10",
            useThemeifyColor=True,
            showCommandWidgets=False,
            disableWebcamNonce=False,
            commandWidgetArray=[dict(
                icon='command-icon.png',
                name='Default',
                command="echo 9V")],
            enableDashMultiCam=False,
            _webcamArray=[dict(
                name='Default',
                url=octoprint.settings.settings().get(["webcam", "stream"]),
                flipV=octoprint.settings.settings().get(["webcam", "flipV"]),
                flipH=octoprint.settings.settings().get(["webcam", "flipH"]),
                rotate=octoprint.settings.settings().get(
                    ["webcam", "rotate90"]),
                disableNonce=False,
                streamRatio=octoprint.settings.settings().get(
                    ["webcam", "streamRatio"]),
            )],
            layerIndicatorArray=[
                dict(slicer='CURA',
                     regx='^;LAYER:([0-9]+)'),
                dict(slicer='Simplify3D',
                     regx='^; layer ([0-9]+)'),
                dict(slicer='Slic3r/PrusaSlicer',
                     regx='^;BEFORE_LAYER_CHANGE')
            ],
            defaultWebcam=0,
            dashboardOverlayFull=False,
            fsSystemInfo=True,
            fsTempGauges=True,
            fsFan=True,
            fsCommandWidgets=True,
            fsJobControlButtons=False,
            fsSensorInfo=True,
            fsPrinterMessage=True,
            fsProgressGauges=True,
            fsLayerGraph=False,
            fsFilament=True,
            fsWebCam=True
        )

    def on_settings_save(self, data):
        if (ACCESS_PERMISSIONS_AVAILABLE and not Permissions.PLUGIN_DASHBOARD_ADMIN.can()):
            try:
                del data['commandWidgetArray']
            except Exception:
                pass
        octoprint.plugin.SettingsPlugin.on_settings_save(self, data)
        self.cmd_commands = self._settings.get(["commandWidgetArray"])
        self.cmd_get_stats(do_timer=False)

    # ~~ Hooks ~~

    def get_additional_permissions(self):
        """
        Returns dashboard-specific user permissions
        """
        return [
            dict(key="ADMIN",
                 name="Admin access",
                 description="Allows modifying or adding shell commands",
                 roles=["admin"],
                 dangerous=True,
                 default_groups=[ADMIN_GROUP])
        ]

    def get_update_information(self):
        """
        Return update info
        """
        return dict(
            dashboard=dict(
                displayName="Dashboard Plugin",
                displayVersion=self._plugin_version,

                # version check: github repository
                type="github_release",
                user="j7126",
                repo="OctoPrint-Dashboard",
                current=self._plugin_version,

                # update method: pip
                pip="https://github.com/j7126/OctoPrint-Dashboard/archive/{target_version}.zip"
            )
        )

    def process_gcode(self, comm_instance, phase, cmd, cmd_type, gcode):
        """
        Process gcode when it is queued to be sent
        """
        if not gcode:
            return

        elif gcode in ("M117"):
            # Own layer indicator from pre-processor. Strip command.
            if cmd.startswith("M117 DASHBOARD_LAYER_INDICATOR"):
                self.current_layer = int(cmd.replace(
                    "M117 DASHBOARD_LAYER_INDICATOR ", ""))
                self.layer_moves = 0
                self.layer_progress = 0

                # Calc layer duration
                # We need to get to the second layer before calculating the previous layer duration
                if self.layer_start_time is not None:
                    self.last_layer_duration = int(
                        round((datetime.now() - self.layer_start_time).total_seconds()))
                    # Update the layer graph data:
                    self.layer_times.append(self.last_layer_duration)
                    self.layer_labels.append(self.current_layer - 1)
                    self.average_layer_duration = int(
                        round(sum(self.layer_times) / len(self.layer_times)))
                    self.average_layer_times.append(
                        self.average_layer_duration)

                self.layer_start_time = datetime.now()
                msg = dict(
                    updateReason="layerChanged",
                    currentLayer=str(self.current_layer),
                    lastLayerDuration=str(self.last_layer_duration),
                    averageLayerDuration=str(self.average_layer_duration),
                    layerLabels=str(self.layer_labels),
                    layerTimes=str(self.layer_times),
                    averageLayerTimes=str(self.average_layer_times)
                )
                self._plugin_manager.send_plugin_message(self._identifier, msg)

                return []  # Remove the Layer Indicator
            else:
                self.printer_message = cmd.replace("M117 ", "")

        elif gcode in ("M106"):  # Set fan speed
            matched = self.fan_speed_pattern.match(cmd.upper())
            if matched:
                self.fan_speed = float(matched.group(
                    1)) * 100.0 / 255.0  # get percent
                msg = dict(
                    updateReason="fanSpeedChanged",
                    fanSpeed=str(self.fan_speed)
                )
                self._plugin_manager.send_plugin_message(self._identifier, msg)

        elif gcode in ("M107"):  # Turn fan off
            self.fan_speed = 0.0
            msg = dict(
                updateReason="fanSpeedChanged",
                fanSpeed=str(self.fan_speed)
            )
            self._plugin_manager.send_plugin_message(self._identifier, msg)

        elif gcode in ("M82", "G90"):
            self.extruder_mode = "absolute"

        elif gcode in ("M83", "G91"):
            self.extruder_mode = "relative"

        elif gcode in ("G92"):  # Extruder Reset
            if self.extruder_mode == "absolute":
                self.extruded_filament_arr.append(self.extruded_filament)
            else:
                return

        elif gcode in ("G0", "G1"):

            self.layer_moves += 1
            # Avoid moves prior to the first layer and un-preprocessed gcode files.
            if int(self.current_layer) >= 1 and int(self.total_layers) > 0 and int(len(self.layer_move_array)) > 0:
                current_layer_progress = int(
                    (self.layer_moves / self.layer_move_array[self.current_layer - 1]) * 100)
                # We only want to update if the progress actually changes
                if current_layer_progress > self.layer_progress:
                    self.layer_progress = current_layer_progress
                    msg = dict(
                        updateReason="layerProgressChanged",
                        layerProgress=str(self.layer_progress)
                    )
                    self._plugin_manager.send_plugin_message(
                        self._identifier, msg)

            cmd_dict = dict((x, float(y)) for d, x, y in (
                re.split('([A-Z])', i) for i in cmd.upper().split()))
            if "E" in cmd_dict:
                e = float(cmd_dict["E"])
                if self.extruder_mode == "absolute":
                    self.extruded_filament = e
                elif self.extruder_mode == "relative":
                    self.extruded_filament += e
                else:
                    return
            if "Z" in cmd_dict:
                self.current_height = float(cmd_dict["Z"])
                msg = dict(
                    updateReason="heightChanged",
                    currentHeight=str(self.current_height)
                )
                self._plugin_manager.send_plugin_message(self._identifier, msg)
            if "F" in cmd_dict:
                # convert from mm/m to mm/s
                self.current_feedrate = float(cmd_dict["F"]) / 60
                self.average_feedrates.append(self.current_feedrate)
                self.average_feedrate = sum(
                    self.average_feedrates) / len(self.average_feedrates)
                msg = dict(
                    updateReason="feedrateChanged",
                    currentFeedrate=str(self.current_feedrate),
                    averageFeedrate=str(self.average_feedrate)
                )
        else:
            return

    def file_pre_processor(self, path, file_object, links=None, printer_profile=None, allow_overwrite=True):
        """
        Pre-process upload gcode files
        """
        file_name = file_object.filename
        if not octoprint.filemanager.valid_file_type(file_name, type="gcode"):
            return file_object
        file_stream = file_object.stream()
        self._logger.info("GcodePreProcessor started processing.")
        self.gcode_preprocessor = GcodePreProcessor(
            file_stream,
            self.layer_indicator_patterns,
            self.layer_move_pattern,
            self.python_version
        )
        self._logger.info("GcodePreProcessor finished processing.")
        return octoprint.filemanager.util.StreamWrapper(file_name, self.gcode_preprocessor)


__plugin_name__ = "Dashboard"
__plugin_pythoncompat__ = ">=3.7,<4"
__plugin_implementation__ = None
__plugin_hooks__ = None


def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = DashboardPlugin()

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
        "octoprint.comm.protocol.gcode.queued": __plugin_implementation__.process_gcode,
        "octoprint.filemanager.preprocessor": __plugin_implementation__.file_pre_processor
    }
    if ACCESS_PERMISSIONS_AVAILABLE:
        __plugin_hooks__["octoprint.access.permissions"] = __plugin_implementation__.get_additional_permissions
