# coding=utf-8
from __future__ import absolute_import, unicode_literals
import os
import sys
import psutil
import re
import platform
import json
import subprocess
from datetime import timedelta
from datetime import datetime
import octoprint.plugin
from octoprint.util import RepeatedTimer, ResettableTimer
import octoprint.filemanager
import octoprint.filemanager.util
import octoprint.util
from octoprint.events import Events, eventManager
from collections import deque
noAccessPermissions = False
try:
    from octoprint.access import ADMIN_GROUP
    from octoprint.access.permissions import Permissions
except ImportError:
    noAccessPermissions = True


class GcodePreProcessor(octoprint.filemanager.util.LineProcessorStream):

    def __init__(self, fileBufferedReader, layer_indicator_patterns, layer_move_pattern, python_version):
        super(GcodePreProcessor, self).__init__(fileBufferedReader)
        self.layer_indicator_patterns = layer_indicator_patterns
        self.layer_move_pattern = layer_move_pattern
        self.python_version = python_version
        self.current_layer_count = 0
        self.total_layer_count = 0
        self.layer_moves = 0
        self.layer_move_array = []

    def process_line(self, origLine):
        if not len(origLine):
            return None

        if (self.python_version == 3):
            line = origLine.decode('utf-8').lstrip()

        if re.match(self.layer_move_pattern, line) is not None:
            self.layer_moves += 1

        for layer_indicator_pattern in self.layer_indicator_patterns:
            if layer_indicator_pattern.match(line):
                self.current_layer_count += 1
                line = line + "M117 DASHBOARD_LAYER_INDICATOR " + \
                    str(self.current_layer_count) + "\r\n"
                self.total_layer_count = self.current_layer_count
                self.layer_move_array.append(self.layer_moves)
                self.layer_moves = 0
                break  # Skip trying to match more patterns

        if (self.python_version == 3):
            line = line.encode('utf-8')

        return line


class DashboardPlugin(octoprint.plugin.SettingsPlugin,
                      octoprint.plugin.StartupPlugin,
                      octoprint.plugin.AssetPlugin,
                      octoprint.plugin.TemplatePlugin,
                      octoprint.plugin.UiPlugin,
                      octoprint.plugin.EventHandlerPlugin):

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
    layer_move_pattern = re.compile("^G[0-1]\s")
    layer_move_array = []
    layer_moves = 0
    layer_progress = 0
    last_layer_duration = 0
    average_layer_duration = 0
    current_height = 0.0
    current_feedrate = 0.0
    average_feedrates = deque([], maxlen=10)  # Last 10 moves
    average_feedrate = 0.0
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

    httpStatusCodes = {
        202: "ACCEPTED",
        502: "BAD_GATEWAY",
        400: "BAD_REQUEST",
        409: "CONFLICT",
        100: "CONTINUE",
        201: "CREATED",
        417: "EXPECTATION_FAILED",
        424: "FAILED_DEPENDENCY",
        403: "FORBIDDEN",
        504: "GATEWAY_TIMEOUT",
        410: "GONE",
        505: "HTTP_VERSION_NOT_SUPPORTED",
        418: "IM_A_TEAPOT",
        419: "INSUFFICIENT_SPACE_ON_RESOURCE",
        507: "INSUFFICIENT_STORAGE",
        500: "INTERNAL_SERVER_ERROR",
        411: "LENGTH_REQUIRED",
        423: "LOCKED",
        420: "METHOD_FAILURE",
        405: "METHOD_NOT_ALLOWED",
        301: "MOVED_PERMANENTLY",
        302: "MOVED_TEMPORARILY",
        207: "MULTI_STATUS",
        300: "MULTIPLE_CHOICES",
        511: "NETWORK_AUTHENTICATION_REQUIRED",
        204: "NO_CONTENT",
        203: "NON_AUTHORITATIVE_INFORMATION",
        406: "NOT_ACCEPTABLE",
        404: "NOT_FOUND",
        501: "NOT_IMPLEMENTED",
        304: "NOT_MODIFIED",
        200: "OK",
        206: "PARTIAL_CONTENT",
        402: "PAYMENT_REQUIRED",
        308: "PERMANENT_REDIRECT",
        412: "PRECONDITION_FAILED",
        428: "PRECONDITION_REQUIRED",
        102: "PROCESSING",
        407: "PROXY_AUTHENTICATION_REQUIRED",
        431: "REQUEST_HEADER_FIELDS_TOO_LARGE",
        408: "REQUEST_TIMEOUT",
        413: "REQUEST_TOO_LONG",
        414: "REQUEST_URI_TOO_LONG",
        416: "REQUESTED_RANGE_NOT_SATISFIABLE",
        205: "RESET_CONTENT",
        303: "SEE_OTHER",
        503: "SERVICE_UNAVAILABLE",
        101: "SWITCHING_PROTOCOLS",
        307: "TEMPORARY_REDIRECT",
        429: "TOO_MANY_REQUESTS",
        401: "UNAUTHORIZED",
        451: "UNAVAILABLE_FOR_LEGAL_REASONS",
        422: "UNPROCESSABLE_ENTITY",
        415: "UNSUPPORTED_MEDIA_TYPE",
        305: "USE_PROXY",
        421: "MISDIRECTED_REQUEST",
    }

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

    def will_handle_ui(self, request):
        return "dashboard" in request.args

    def on_ui_render(self, now, request, render_kwargs):
        from flask import make_response, render_template
        res = None
        try:
            res = make_response(render_template("dashboard_index.jinja2", **render_kwargs, themeData=self._settings.get(["themeData"])))
        except Exception as e:
            self._logger.error(f'Error rendering template {e}')
            res = make_response(render_template("dashboard_error.jinja2", httpStatusCodes=self.httpStatusCodes, statusCode=500))
        return res

    def psUtilGetStats(self):
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
                tempFile = open("/sys/class/thermal/thermal_zone0/temp")
                cpu_val = tempFile.read()
                tempFile.close()
                self.cpu_temp = int(round(float(cpu_val)/1000))
            self.cpu_percent = str(
                psutil.cpu_percent(interval=None, percpu=False))
            self.cpu_freq = str(
                int(round(psutil.cpu_freq(percpu=False).current, 0)))
            self.virtual_memory_percent = str(psutil.virtual_memory().percent)
            self.disk_usage = str(psutil.disk_usage("/").percent)
        t = ResettableTimer(3.0, self.psUtilGetStats)
        t.daemon = True
        t.start()

    def cmdGetStats(self, runTimer=True):
        del self.cmd_results[:]
        for command in self.cmd_commands:
            process = subprocess.Popen(command.get(
                "command"), stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
            stdout, stderr = process.communicate()
            if (self.python_version == 3):  # Python 3.5
                result = stdout.strip().decode('ascii') + stderr.strip().decode('ascii')
            else:  # Python 2
                result = stdout.strip() + stderr.strip()
            self.cmd_results.append(result)
        self._plugin_manager.send_plugin_message(
            self._identifier, dict(cmdResults=json.dumps(self.cmd_results)))
        if runTimer == True:
            t = ResettableTimer(60.0, self.cmdGetStats)
            t.daemon = True
            t.start()

    # ~~ StartupPlugin mixin

    def on_after_startup(self):
        self._logger.info("Dashboard started")
        if (sys.version_info > (3, 5)):  # Detect and set python version
            self.python_version = 3
        else:
            self.python_version = 2

        # Build self.layer_indicator_patterns from settings
        self.layer_indicator_config = self._settings.get(
            ["layerIndicatorArray"])
        for layer_indicator in self.layer_indicator_config:
            self.layer_indicator_patterns.append(
                re.compile(layer_indicator.get("regx")))

        self.cmd_commands = self._settings.get(["commandWidgetArray"])
        self.psUtilGetStats()
        self.cmdGetStats()
        self.timer = RepeatedTimer(
            3.0, self.send_notifications, run_first=True)
        self.timer.start()

    def send_notifications(self):
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

    def on_event(self, event, payload):
        '''
        if event == "DisplayLayerProgress_layerChanged" or event == "DisplayLayerProgress_fanspeedChanged" or event == "DisplayLayerProgress_heightChanged":
                msg = dict(
                        updateReason="dlp",
                        totalLayer=payload.get('totalLayer'),
                        currentLayer=payload.get('currentLayer'),
                        currentHeight=payload.get('currentHeightFormatted'),
                        totalHeight=payload.get('totalHeightFormatted'),
                        feedrate=payload.get('feedrate'),
                        feedrateG0=payload.get('feedrateG0'),
                        feedrateG1=payload.get('feedrateG1'),
                        fanspeed=payload.get('fanspeed'),
                        lastLayerDuration=payload.get('lastLayerDuration'),
                        lastLayerDurationInSeconds=payload.get('lastLayerDurationInSeconds'),
                        averageLayerDuration=payload.get('averageLayerDuration'),
                        averageLayerDurationInSeconds=payload.get('averageLayerDurationInSeconds'),
                        changeFilamentTimeLeftInSeconds=payload.get('changeFilamentTimeLeftInSeconds'),
                        changeFilamentCount=payload.get('changeFilamentCount')
                )
                self._plugin_manager.send_plugin_message(self._identifier, msg)

        if event == "DisplayLayerProgress_layerChanged" and payload.get('lastLayerDurationInSeconds') != "-" and int(payload.get('lastLayerDurationInSeconds')) > 0:
                # Update the layer graph data
                self.layer_times.append(payload.get('lastLayerDurationInSeconds'))
                self.layer_labels.append(int(payload.get('currentLayer')) - 1)
        '''
        if event == Events.METADATA_ANALYSIS_FINISHED:
            # Store the total_layer_count and layer_move_array in the file metadata once all analysis is finished
            self._logger.info("GcodePreProcessor found layers: " +
                              str(self.gcode_preprocessor.total_layer_count))
            self._logger.info(
                "GcodePreProcessor saving layer count in file metadata")
            additionalMetaData = {"total_layer_count": str(
                self.gcode_preprocessor.total_layer_count), "layer_move_array": json.dumps(self.gcode_preprocessor.layer_move_array)}
            self._file_manager.set_additional_metadata(payload.get("origin"), payload.get(
                "name"), self._plugin_info.key, additionalMetaData, overwrite=True)

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

            metaData = self._file_manager.get_metadata(payload.get(
                "origin"), payload.get("path"))  # Get OP metadata from file
            #self._logger.info("Metadata: " + json.dumps(metaData, indent=4))

            try:
                self.total_layers = metaData['dashboard']['total_layer_count']
            except KeyError:
                pass
            try:
                self.layer_move_array = json.loads(
                    metaData['dashboard']['layer_move_array'])
            except KeyError:
                pass
            try:
                self.max_x = str(metaData['analysis']['printingArea']['maxX'])
            except KeyError:
                pass
            try:
                self.max_y = str(metaData['analysis']['printingArea']['maxy'])
            except KeyError:
                pass
            try:
                self.max_z = str(metaData['analysis']['printingArea']['maxZ'])
            except KeyError:
                pass
            try:
                self.min_x = str(metaData['analysis']['printingArea']['minX'])
            except KeyError:
                pass
            try:
                self.min_y = str(metaData['analysis']['printingArea']['minY'])
            except KeyError:
                pass
            try:
                self.min_z = str(metaData['analysis']['printingArea']['minZ'])
            except KeyError:
                pass
            try:
                self.depth = str(metaData['analysis']['dimensions']['depth'])
            except KeyError:
                pass
            try:
                self.height = str(metaData['analysis']['dimensions']['height'])
            except KeyError:
                pass
            try:
                self.width = str(metaData['analysis']['dimensions']['width'])
            except KeyError:
                pass
            try:
                self.estimated_print_time = str(
                    metaData['analysis']['estimatedPrintTime'])
            except KeyError:
                pass
            try:
                self.average_print_time = str(
                    metaData['statistics']['averagePrintTime'])
            except KeyError:
                pass
            try:
                self.last_print_time = str(
                    metaData['statistics']['averagePrintTime'])
            except KeyError:
                pass

            #self._logger.info("Total Layers" + str(self.total_layers))
            if int(self.total_layers) > 0:
                self.is_preprocessed = True
            else:
                self._logger.warn(
                    "Gcode not pre-processed by Dashboard. Upload again to get layer metrics")

            msg = dict(
                printStarted="True",
                isPreprocessed=str(self.is_preprocessed)
            )
            self._plugin_manager.send_plugin_message(self._identifier, msg)

    def get_settings_defaults(self):
        return dict(
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
            fsWebCam=True,
            themeData=dict(
                primary="#13c100",
                secondary="#0069cc"
            )
        )

    def on_settings_save(self, data):
        if (noAccessPermissions == False and Permissions.PLUGIN_DASHBOARD_ADMIN.can() == False):
            try:
                del data['commandWidgetArray']
            except:
                pass
        # self._logger.info(str(data))
        octoprint.plugin.SettingsPlugin.on_settings_save(self, data)
        self.cmd_commands = self._settings.get(["commandWidgetArray"])
        self.cmdGetStats(runTimer=False)

    # def get_template_configs(self):
    #    return [
    #        dict(type="tab", custom_bindings=True),
    #        dict(type="settings", custom_bindings=True)
    #    ]

    # ~~ AssetPlugin mixin
    # def get_assets(self):
    #    return dict(
    #        js=["js/dashboard.js", "js/chartist.min.js", "js/fitty.min.js"],
    #        css=["css/chartist.min.css"],
    #        less=["less/dashboard.less"]
    #    )

    # ~~ Softwareupdate hook
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

                # update method: pip
                pip="https://github.com/j7126/OctoPrint-Dashboard/archive/{target_version}.zip"
            )
        )

    def process_gcode(self, comm_instance, phase, cmd, cmd_type, gcode, *args, **kwargs):
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

            CmdDict = dict((x, float(y)) for d, x, y in (
                re.split('([A-Z])', i) for i in cmd.upper().split()))
            if "E" in CmdDict:
                e = float(CmdDict["E"])
                if self.extruder_mode == "absolute":
                    self.extruded_filament = e
                elif self.extruder_mode == "relative":
                    self.extruded_filament += e
                else:
                    return
            if "Z" in CmdDict:
                self.current_height = float(CmdDict["Z"])
                msg = dict(
                    updateReason="heightChanged",
                    currentHeight=str(self.current_height)
                )
                self._plugin_manager.send_plugin_message(self._identifier, msg)
            if "F" in CmdDict:
                # convert from mm/m to mm/s
                self.current_feedrate = float(CmdDict["F"]) / 60
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

    def createFilePreProcessor(self, path, file_object, blinks=None, printer_profile=None, allow_overwrite=True, *args, **kwargs):

        fileName = file_object.filename
        if not octoprint.filemanager.valid_file_type(fileName, type="gcode"):
            return file_object
        fileStream = file_object.stream()
        self._logger.info("GcodePreProcessor started processing.")
        self.gcode_preprocessor = GcodePreProcessor(
            fileStream, self.layer_indicator_patterns, self.layer_move_pattern, self.python_version)
        self._logger.info("GcodePreProcessor finished processing.")
        return octoprint.filemanager.util.StreamWrapper(fileName, self.gcode_preprocessor)


__plugin_name__ = "Dashboard"
__plugin_pythoncompat__ = ">=2.7,<4"


def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = DashboardPlugin()

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
        "octoprint.comm.protocol.gcode.queued": __plugin_implementation__.process_gcode,
        "octoprint.filemanager.preprocessor": __plugin_implementation__.createFilePreProcessor
    }
    if noAccessPermissions == False:
        __plugin_hooks__[
            "octoprint.access.permissions"] = __plugin_implementation__.get_additional_permissions
