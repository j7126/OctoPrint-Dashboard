# coding=utf-8

#  OctoPrint-Dashboard
#
#  Authors:
#   - Jefferey Neuffer (https://github.com/j7126)
#   - Will MacCormack (https://github.com/willmac16)
#   - Stefan Cohen (https://github.com/StefanCohen)
#
#  Copyright (C) 2022
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU Affero General Public License as
#  published by the Free Software Foundation, either version 3 of the
#  License, or (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU Affero General Public License for more details.
#
#  You should have received a copy of the GNU Affero General Public License
#  along with this program.  If not, see <https://www.gnu.org/licenses/>.

from __future__ import absolute_import, unicode_literals

import json
import logging
import os
import platform
import re
import subprocess
import sys
import time
import unicodedata
from datetime import datetime

import octoprint.filemanager
import octoprint.filemanager.util
import octoprint.plugin
import octoprint.util
import psutil
from octoprint.events import Events
from octoprint.filemanager import FileDestinations
from octoprint.util import RepeatedTimer

try:
    from octoprint.access import ADMIN_GROUP
    from octoprint.access.permissions import Permissions
    ACCESS_PERMISSIONS_AVAILABLE = True
except ImportError:
    ACCESS_PERMISSIONS_AVAILABLE = False

from octoprint_dashboard.gcode_processor import GcodePreProcessor


class DashboardPlugin(octoprint.plugin.SettingsPlugin,
                      octoprint.plugin.StartupPlugin,
                      octoprint.plugin.AssetPlugin,
                      octoprint.plugin.TemplatePlugin,
                      octoprint.plugin.EventHandlerPlugin,
                      octoprint.plugin.SimpleApiPlugin):

    _plugin_info = None

    layer_move_pattern = re.compile(r"^G[0-3]\s")
    filament_change_pattern = re.compile(r"^(T[0-9]+|M600)")
    fan_speed_pattern = re.compile(r"^M106.* S(\d+\.?\d*).*")

    moves_to_update_progress = 10

    psuTimer = None

    jsErrors = []
    _js_logger = None

    last_update = time.time()

    # data
    printer_message = ""
    extruded_filament = 0.0
    extruded_filament_last_send = 0.0
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
    cmd_commands = []
    cmd_timers = []
    gcode_preprocessors = {}
    python_version = 0
    is_preprocessed = False
    layer_indicator_config = []
    layer_indicator_patterns = []
    layer_start_time = None
    filament_change_array = []
    current_move = 0
    total_moves = 0
    next_change = 0
    time_to_next_change = "-"
    layer_analysis_error = [False, False, False]
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
                self.cpu_temp = int(round(float(thermal['soc_thermal'][0][1])*1000))
            elif 'coretemp' in thermal:  # Intel
                for temp in range(0, len(thermal["coretemp"]), 1):
                    temp_sum = temp_sum+thermal["coretemp"][temp][1]
                self.cpu_temp = int(round(temp_sum / len(thermal["coretemp"])))
            elif 'w1_slave_temp' in thermal:  # Dallas temp sensor fix
                with open('/sys/class/thermal/thermal_zone0/temp') as temp_file:
                    cpu_val = temp_file.read()
                    self.cpu_temp = int(round(float(cpu_val)/1000))
            elif "cpu" in thermal:  # RockPi (probably all RockChip CPUs/SOCs)
                self.cpu_temp = int(round((thermal["cpu"][0][1])))
            elif 'cpu_thermal_zone' in thermal: #OrangePI_Zero2
                self.cpu_temp = int(round((thermal["cpu_thermal_zone"][0][1])))
            elif "scpi_sensors" in thermal: # Le Potato sbc
                self.cpu_temp = int(round((thermal["scpi_sensors"][0][1])))
            elif "sunxi-therm-1" in thermal: # Orange Pi Zero Plus 2 H3
                self.cpu_temp = int(round(thermal["sunxi-therm-1"][0][1] * 1000))
                if "sunxi-therm-2" in thermal:
                    # ok, get max temp
                    self.cpu_temp = max([int(round(thermal["sunxi-therm-2"][0][1] * 1000)), self.cpu_temp])
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
            self._plugin_manager.send_plugin_message(self._identifier, psutilMsg)

    def run_cmd(self, cmd_index):
        """
        Run command widget
        """

        cmd = self.cmd_commands[cmd_index].get("command")
        interval = float(self.cmd_commands[cmd_index].get("interval"))
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        if sys.version_info >= (3, 3):
            try:
                stdout, stderr = process.communicate(timeout=interval)
            except subprocess.TimeoutExpired:
                process.kill()
                self._logger.warn("cmd widget \"{0}\" ran for too long".format(cmd))
                stdout, stderr = process.communicate()
        else:
            stdout, stderr = process.communicate()

        if sys.version_info > (3, 5):
            # Python 3.5
            result = stdout.strip().decode("ascii", "ignore")
            error = stderr.strip().decode("ascii", "ignore")
        else:
            # Python 2
            result = stdout.strip()
            error = stderr.strip()

        if error != "":
            self._logger.warn("cmd widget ran with error: " + error)

        results = {"index": cmd_index, "result": result}
        self._plugin_manager.send_plugin_message(self._identifier, dict(cmdResults=json.dumps(results)))

    def test_cmd(self, cmd):
        """
        Test command widget
        """
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)

        if sys.version_info >= (3, 3):
            try:
                stdout, stderr = process.communicate(timeout=10.0)
            except subprocess.TimeoutExpired:
                process.kill()
                self._logger.warn("cmd widget test \"{0}\" ran for too long".format(cmd))
                stdout, stderr = process.communicate()
        else:
            stdout, stderr = process.communicate()

        if sys.version_info > (3, 5):
            # Python 3.5
            result = stdout.strip().decode("ascii", "ignore") + stderr.strip().decode("ascii", "ignore")
        else:
            # Python 2
            result = stdout.strip() + stderr.strip()

        results = {"result": result}

        self._plugin_manager.send_plugin_message(self._identifier, dict(cmdTest=json.dumps(results)))

    def update_cmds(self):
        """
        Update Command Widgets
        """
        self.cmd_commands = self._settings.get(["commandWidgetArray"])

        for timer in self.cmd_timers:
            timer.cancel()

        del self.cmd_timers[:]

        if self._settings.get_boolean(['showCommandWidgets']):
            for index, command in enumerate(self.cmd_commands):
                if command.get("enabled"):
                    timer = RepeatedTimer(float(command.get("interval")), self.run_cmd, [index], run_first=True)
                    timer.start()
                    self.cmd_timers.append(timer)

    # ~~ SimpleApiPlugin mixin
    def get_api_commands(self):
        return dict(
            testCmdWidget=["cmd"],
            jsError=["msg"]
        )

    def on_api_command(self, command, data):
        if command == "testCmdWidget":
            if (not ACCESS_PERMISSIONS_AVAILABLE) or Permissions.PLUGIN_DASHBOARD_ADMIN.can():
                self._logger.info("testCmdWidget called, cmd is {cmd}".format(**data))
                self.test_cmd(data["cmd"])
            else:
                self._logger.info("testCmdWidget called, but without proper permissions")
        # log frontend js errors
        if command == "jsError":
            if data["msg"] not in self.jsErrors:
                self.jsErrors.append(data["msg"])
                self._logger.error(
                    "Frontend javascript error detected (this error is not necesarily to do with dashboard):\n{msg}".format(**data)
                )
                self._js_logger.error(data["msg"])

    # ~~ StartupPlugin mixin
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

        if self._settings.get_boolean(["showSystemInfo"]):
            self.psuTimer = RepeatedTimer(3.0, self.ps_util_get_stats)
            self.psuTimer.daemon = True
            self.psuTimer.start()

        self.update_cmds()

        self._js_logger = logging.getLogger("octoprint.JsFrontendErrors(Dash)")
        self._js_logger.info("Js Logger (Dash) started")
        self._logger.debug("JS Logger started")

    def connect_notification(self):
        """
        Notify clients of all data when a new client is connected
        """
        msg = dict(
            cpuPercent=str(self.cpu_percent),
            virtualMemPercent=str(self.virtual_memory_percent),
            diskUsagePercent=str(self.disk_usage),
            cpuTemp=str(self.cpu_temp),
            cpuFreq=str(self.cpu_freq),
            extrudedFilament=str(round((self.extruded_filament_store + self.extruded_filament) / 1000, 3)),
            layerTimes=str(self.layer_times),
            layerLabels=str(self.layer_labels),
            printerMessage=str(self.printer_message),
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
            layerAnalysisError=str(self.layer_analysis_error),
            averageLayerTimes=str(self.average_layer_times),
            fanSpeed=str(self.fan_speed),
            currentHeight=str(self.current_height),
            totalMoves=str(self.total_moves),
            timeToNextChange=self.time_to_next_change
        )
        self._plugin_manager.send_plugin_message(self._identifier, msg)

    def unload_preprocesser(self, processor, payload):
        """
        Unload the gcode pre-processor
        """
        # Stick the final layer into the array (the one the print ends on)
        processor.layer_move_array.append(processor.layer_moves)
        processor.layer_count += 1

        # Store the total_layer_count and layer_move_array in the file metadata once all analysis is finished
        self._logger.info("GcodePreProcessor found layers: " + str(processor.layer_count))
        self._logger.info("GcodePreProcessor found filament changes: " + str(len(processor.filament_change_array)))
        self._logger.info("GcodePreProcessor saving layer count in file metadata")
        additional_metadata = {
            "layer_move_array": json.dumps(processor.layer_move_array),
            "filament_change_array": json.dumps(processor.filament_change_array)
        }
        self._file_manager.set_additional_metadata(
            payload.get("origin"),
            payload.get("path"),
            self._plugin_info.key,
            additional_metadata,
            overwrite=True
        )

    def load_from_meta(self, payload):
        """
        Load pre-processed metadata, and pre-process file if needed
        """

        # Reset vars
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

        metadata = self._file_manager.get_metadata(
            payload.get("origin"),
            payload.get("path")
        )  # Get OP metadata from file

        try:
            self.layer_move_array = json.loads(metadata['dashboard']['layer_move_array'])
            self.total_layers = len(self.layer_move_array)
            self.total_moves = sum(self.layer_move_array)
        except KeyError:
            pass
        try:
            self.filament_change_array = json.loads(metadata['dashboard']['filament_change_array'])
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
            self.estimated_print_time = str(metadata['analysis']['estimatedPrintTime'])
        except KeyError:
            pass
        try:
            self.average_print_time = str(metadata['statistics']['averagePrintTime'])
        except KeyError:
            pass
        try:
            self.last_print_time = str(metadata['statistics']['lastPrintTime'])
        except KeyError:
            pass

        if int(self.total_layers) > 0:
            self.is_preprocessed = True
        else:
            if payload['origin'] == 'local':
                self._logger.info("Gcode not pre-processed by Dashboard. Processing now.")

                path = self._file_manager.path_on_disk(FileDestinations.LOCAL, payload['path'])
                file_object = octoprint.filemanager.util.DiskFileWrapper(payload['name'], path)
                stream = self.create_file_pre_processor(path, file_object)
                stream.save(path)
                self._logger.info("Gcode pre-processing done.")
                self.unload_preprocesser(self.gcode_preprocessors[path], payload)
                self.load_from_meta(payload)
                return
            else:
                self._logger.warn("Gcode not pre-processed by Dashboard. Upload again to get layer metrics")

        self.current_feedrate = 0.0
        self.avg_feedrate = 0.0
        self.feed_avg_start = time.time()
        self.last_feed_change = time.time()

        msg = dict(
            printStarted="True",
            isPreprocessed=str(self.is_preprocessed),
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
            totalMoves=str(self.total_moves),
            timeToNextChange=self.time_to_next_change,
            totalLayers=str(self.total_layers)
        )
        self._plugin_manager.send_plugin_message(self._identifier, msg)

    def print_ended(self):
        """
        Clean up on print end
        """
        for i in range(len(self.layer_analysis_error)):
            self.layer_analysis_error[i] = False

        if self._settings.get(['clearOn_Feedrate']) == 2:
            self.current_feedrate = 0.0
            self.avg_feedrate = 0.0
            self.feed_avg_start = time.time()
            self.last_feed_change = time.time()

        msg = dict(
            printEnd="True",
            layerAnalysisError=str(self.layer_analysis_error)
        )
        self._plugin_manager.send_plugin_message(self._identifier, msg)

    def on_event(self, event, payload):
        if event == Events.METADATA_ANALYSIS_FINISHED:
            if payload['path'] in self.gcode_preprocessors:
                gcpp = self.gcode_preprocessors.pop(payload['path'])
                self.unload_preprocesser(gcpp, payload)
        elif event == Events.PRINT_STARTED:
            self.load_from_meta(payload)
        elif event == Events.PRINT_DONE or event == Events.PRINT_FAILED or event == Events.PRINT_CANCELLED:
            self.print_ended()
        elif event == Events.CLIENT_AUTHED:
            self.connect_notification()

    # ~~ SettingsPlugin mixin
    def get_settings_defaults(self):
        # settings defaults
        return dict(
            # progress gauges
            gaugetype="circle",
            # temp gauges
            hotendTempMax="300",
            bedTempMax="100",
            chamberTempMax="50",
            temperatureTicks="0",
            hideHotend=False,
            showTempGaugeColors=False,
            targetTempDeviation="10",
            # enclosure
            enclosureGaugeStyle="3/4",
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
            commandWidgetArray=[
                dict(
                    icon='chamber-icon.png',
                    name='Simulated Chamber',
                    command='echo "47.6" | bc',
                    enabled=False,
                    interval="60",
                    type="3/4")
            ],
            # webcams
            disableWebcamNonce=False,
            enableDashMultiCam=False,
            _webcamArray=[dict(
                name='Default',
                url=octoprint.settings.settings().get(["webcam", "stream"]),
                flipV=octoprint.settings.settings().get(["webcam", "flipV"]),
                flipH=octoprint.settings.settings().get(["webcam", "flipH"]),
                rotate=octoprint.settings.settings().get(["webcam", "rotate90"]),
                disableNonce=False,
                streamRatio=octoprint.settings.settings().get(["webcam", "streamRatio"]),
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
            showPrintThumbnail=True,
            showStatus=True,
            showFileName=True,
            showTimeEstimate=True,
            showLayerInfo=True,
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
            fsPrintThumbnail=True,
            fsStatus=True,
            fsFileName=True,
            fsTimeEstimate=True,
            fsLayerInfo=True,
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
            printingOnly_Status=False,
            printingOnly_FileName=True,
            printingOnly_TimeEstimate=True,
            printingOnly_LayerInfo=True,
            # clearOn: when to clear data for some of the widgets, 0 = never cleared, 1 = clear on print start, 2 = clear on print end
            clearOn_PrinterMessage=2,
            clearOn_ProgressGauges=2,  # not implemented
            clearOn_LayerGraph=1,
            clearOn_Filament=2,
            clearOn_Feedrate=2,
            clearOn_PrintThumbnail=2,
            # max value of feedrate gauge
            feedrateMax=200,
            # time format for eta
            ETAUse12HTime=False,
            ETAShowSeconds=False,
            ETAShowDate=True,
            # show failed layer analysis warning
            showLayerAnalysisError=True
        )

    def get_settings_restricted_paths(self):
        return dict(
            user=[["_webcamArray", ], ["commandWidgetArray", ]]
        )

    def on_settings_migrate(self, target, current):
        # convert to version 1 (i.e. add enabled and interval)
        if current is None or current < 1:
            tmp_cmd_array = self._settings.get(["commandWidgetArray"])
            for cmd in tmp_cmd_array:
                if not('enabled' in cmd):
                    cmd['enabled'] = False
                if not('interval' in cmd):
                    cmd['interval'] = 10
            self._settings.set(["commandWidgetArray"], tmp_cmd_array)
            self._settings.save()

        # convert to version 2 (i.e. add widget type)
        if current is None or current < 2:
            tmp_cmd_array = self._settings.get(["commandWidgetArray"])
            for cmd in tmp_cmd_array:
                if not('type' in cmd):
                    cmd['type'] = "text"
            self._settings.set(["commandWidgetArray"], tmp_cmd_array)
            self._settings.save()

    def get_settings_version(self):
        return 2

    def on_settings_save(self, data):
        if ACCESS_PERMISSIONS_AVAILABLE and Permissions.PLUGIN_DASHBOARD_ADMIN.can() == False:
            try:
                del data['commandWidgetArray']
            except:
                pass
        octoprint.plugin.SettingsPlugin.on_settings_save(self, data)

        self.cmd_commands = self._settings.get(["commandWidgetArray"])
        self.update_cmds()

        if self.psuTimer:
            self.psuTimer.cancel()

        if self._settings.get_boolean(["showSystemInfo"]):
            self.psuTimer = RepeatedTimer(3.0, self.ps_util_get_stats)
            self.psuTimer.daemon = True
            self.psuTimer.start()

    def get_template_configs(self):
        return [
            dict(type="tab", custom_bindings=True),
            dict(type="settings", custom_bindings=True)
        ]

    # ~~ AssetPlugin mixin
    def get_assets(self):
        return dict(
            js=["js/errorReporter.js", "js/dashboard.js", "js/chartist.min.js", "js/fitty.min.js"],
            css=["css/dashboard.css", "css/chartist.min.css"],
            less=["less/dashboard.less"]
        )

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

    def process_gcode(self, comm_instance, phase, cmd, cmd_type, gcode, *args, **kwargs):
        if not gcode:
            return

        t = time.time()
        if t - self.last_update > 0.5:
            self.last_update = t
            if self.next_change < len(self.filament_change_array):
                estimate = self._printer._estimator.estimate(
                        self.filament_change_array[self.next_change] / self.total_moves,
                        None, None, None, None)[0]
                print_time_left = self._printer.get_current_data()["progress"]["printTimeLeft"]
                if print_time_left is not None and estimate is not None:
                    estimate = print_time_left - estimate
                    self.time_to_next_change = f"{int(estimate) // 60}:{int(estimate) % 60:0<2}"
                else:
                    self.time_to_next_change = "-"
            else:
                self.time_to_next_change = "-"
            msg = dict(
                timeToNextChange=self.time_to_next_change,
                extrudedFilament=str(round((self.extruded_filament_store + self.extruded_filament) / 1000, 3))
            )
            self._plugin_manager.send_plugin_message(self._identifier, msg)

        if gcode in ("M117"):
            # Own layer indicator from pre-processor. Strip command.
            if cmd.startswith("M117 DASHBOARD_LAYER_INDICATOR"):
                self.current_layer = int(cmd.replace("M117 DASHBOARD_LAYER_INDICATOR ", ""))
                self.layer_moves = 0
                self.layer_progress = 0

                # Calculate layer duration
                # We need to get to the second layer before calculating the previous layer duration
                if self.layer_start_time is not None and (
                        len(self.layer_labels) == 0 or self.current_layer - 1 > self.layer_labels[-1]):
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
                    averageLayerTimes=str(self.average_layer_times),
                    layerAnalysisError=str(self.layer_analysis_error),
                )
                self._plugin_manager.send_plugin_message(self._identifier, msg)

                return []  # Remove the Layer Indicator
            else:
                self.printer_message = cmd.replace("M117 ", "")
                self._plugin_manager.send_plugin_message(self._identifier, dict(printerMessage=self.printer_message))

        elif gcode in ("M106"):  # Set fan speed
            matched = self.fan_speed_pattern.match(cmd.upper())
            if matched:
                self.fan_speed = float(matched.group(1)) * 100.0 / 255.0  # get percent
                msg = dict(
                    fanSpeed=str(self.fan_speed)
                )
                self._plugin_manager.send_plugin_message(self._identifier, msg)

        elif gcode in ("M107"):  # Turn fan off
            self.fan_speed = 0.0
            msg = dict(
                fanSpeed=str(self.fan_speed)
            )
            self._plugin_manager.send_plugin_message(self._identifier, msg)

        elif gcode in ("M82", "G90"):
            self.extruder_mode = "absolute"

        elif gcode in ("M83", "G91"):
            self.extruder_mode = "relative"

        elif gcode in ("G92"):  # Extruder Reset
            if self.extruder_mode == "absolute":
                self.extruded_filament_store += self.extruded_filament
                cmd_dict = dict((x, float(y)) for d, x, y in (re.split('([A-Z])', i) for i in cmd.upper().split()))
                if "E" in cmd_dict:
                    self.extruded_filament = float(cmd_dict["E"])
                    self.extruded_filament_store -= self.extruded_filament
                else:
                    self.extruded_filament = 0
                self._plugin_manager.send_plugin_message(self._identifier, dict(extrudedFilament=str(
                    round((self.extruded_filament_store + self.extruded_filament) / 1000, 3))))
            else:
                return

        elif gcode in ("G0", "G1", "G2", "G3"):
            msg = {}

            self.current_move += 1
            self.layer_moves += 1
            # Avoid moves prior to the first layer and un-preprocessed gcode files.
            self.layer_analysis_error[2] = self.total_layers <= 0 or len(self.layer_move_array) <= 0
            if self.current_layer >= 0 and self.total_layers > 0 and len(self.layer_move_array) > 0:
                try:
                    current_layer_progress = int(
                        (self.layer_moves / self.layer_move_array[self.current_layer]) * 100) if self.layer_move_array[self.current_layer] > 0 else 0
                except IndexError:
                    if not self.layer_analysis_error[1]:
                        self._logger.error("Error processing layer progress, IndexError: list index out of range")
                    self.layer_analysis_error[1] = True
                else:
                    self.layer_analysis_error[1] = False
                    if self.layer_moves % self.moves_to_update_progress == 0:  # Update the in, layer progress a reasonable amount
                        self.layer_progress = current_layer_progress
                        self.layer_analysis_error[0] = self.layer_progress > 200
                        if self.layer_progress > 101:
                            self.layer_progress = 0

                        msg.update(dict(
                            layerProgress=str(self.layer_progress),
                            layerAnalysisError=str(self.layer_analysis_error)
                        ))

            try:
                cmd_dict = dict((x, float(y)) for d, x, y in (re.split('([A-Z])', i) for i in cmd.upper().split()))
            except ValueError:
                return

            if "E" in cmd_dict:
                e = float(cmd_dict["E"])
                if self.extruder_mode == "absolute":
                    if e > self.extruded_filament + 10:
                        self.extruded_filament = e
                        msg.update(
                            dict(
                                extrudedFilament=str(
                                    round((self.extruded_filament_store + self.extruded_filament) / 1000, 3))))
                    elif e > self.extruded_filament:
                        self.extruded_filament = e

                elif self.extruder_mode == "relative":
                    if e > 10 or self.extruded_filament + e > self.extruded_filament_last_send + 10:
                        self.extruded_filament += e
                        self.extruded_filament_last_send = self.extruded_filament
                        msg.update(
                            dict(
                                extrudedFilament=str(
                                    round((self.extruded_filament_store + self.extruded_filament) / 1000, 3))))
                    elif e > 0:
                        self.extruded_filament += e
                else:
                    return

            if "Z" in cmd_dict:
                self.current_height = float(cmd_dict["Z"])
                msg.update(dict(
                    currentHeight=str(self.current_height)
                ))
            if "F" in cmd_dict:
                now = time.time()

                # update the time weighted avg of feedrate
                self.avg_feedrate = (
                    self.avg_feedrate * (self.last_feed_change - self.feed_avg_start) + self.current_feedrate *
                    (now - self.last_feed_change)) / (
                    now - self.feed_avg_start)

                self.last_feed_change = now
                self.current_feedrate = float(cmd_dict["F"]) / 60  # convert from mm/m to mm/s
                msg.update(dict(
                    currentFeedrate=self.current_feedrate,
                    avgFeedrate=self.avg_feedrate,
                    lastFeedChange=self.last_feed_change
                ))

            if len(msg) > 0:
                self._plugin_manager.send_plugin_message(self._identifier, msg)
        elif self.filament_change_pattern.match(gcode):
            self.next_change += 1
        
        else:
            return

    def gcode_received_hook(self, comm, line, *args, **kwargs):
        # get fan speed when printing from sd card
        if "M106" not in line:
            return line

        matched = self.fan_speed_pattern.match(line)
        if matched:
            self.fan_speed = float(matched.group(1)) * 100.0 / 255.0  # get percent
            msg = dict(
                fanSpeed=str(self.fan_speed)
            )
            self._plugin_manager.send_plugin_message(self._identifier, msg)

        return line

    def create_file_pre_processor(self,
                                  path,
                                  file_object,
                                  *args, **kwargs):

        file_name = file_object.filename
        if not octoprint.filemanager.valid_file_type(file_name, type="gcode"):
            return file_object
        fileStream = file_object.stream()
        self._logger.info("GcodePreProcessor started processing.")
        self.gcode_preprocessors[path] = GcodePreProcessor(
            fileStream, self.layer_indicator_patterns, self.layer_move_pattern, self.filament_change_pattern, self.python_version, self._logger)
        return octoprint.filemanager.util.StreamWrapper(file_name, self.gcode_preprocessors[path])


__plugin_name__ = "Dashboard"
__plugin_pythoncompat__ = ">=2.7,<4"


def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = DashboardPlugin()

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
        "octoprint.comm.protocol.gcode.sending": __plugin_implementation__.process_gcode,
        "octoprint.comm.protocol.gcode.received": __plugin_implementation__.gcode_received_hook,
        "octoprint.filemanager.preprocessor": __plugin_implementation__.create_file_pre_processor
    }
    if ACCESS_PERMISSIONS_AVAILABLE:
        __plugin_hooks__["octoprint.access.permissions"] = __plugin_implementation__.get_additional_permissions

    global __plugin_settings_overlay__
    __plugin_settings_overlay__ = dict(appearance=dict(components=dict(order=dict(tab=["plugin_dashboard",
                                                                                       "temperature",
                                                                                       "control",
                                                                                       "gcodeviewer",
                                                                                       "terminal",
                                                                                       "timelapse"]))))
