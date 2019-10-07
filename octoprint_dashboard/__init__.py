# coding=utf-8
from __future__ import absolute_import
import octoprint.plugin
from octoprint.util import RepeatedTimer
import re
import psutil
import sys
import os
if sys.platform.startswith("linux"):
    if os.uname()[1].startswith("octopi"):
   		import Adafruit_DHT

from octoprint.events import Events, eventManager

class DashboardPlugin(octoprint.plugin.SettingsPlugin,
                      octoprint.plugin.StartupPlugin,
                      octoprint.plugin.AssetPlugin,
                      octoprint.plugin.TemplatePlugin,
                      octoprint.plugin.EventHandlerPlugin):

    printer_message = ""
    extruded_filament = 0.0
    extruded_filament_arr = []
    extruder_mode = ""
    cpu_percent = 0
    cpu_temp = 0
    virtual_memory_percent = 0
    disk_usage = 0
    layer_times = []
    layer_labels = []

    ambient_humidity = 0
    ambient_temperature = 0
    dht_sensor_pin = 0
    dht_sensor_type = None

    def adafruitDhtGetStats(self):
        if sys.platform.startswith("linux"):
            if os.uname()[1].startswith("octopi"):
                if self.dht_sensor_type == "DHT11":
                    sensor = Adafruit_DHT.DHT11
                elif self.dht_sensor_type == "DHT22":
                    sensor = Adafruit_DHT.DHT22
                else: return
                pin = self.dht_sensor_pin        
                try:
                    self.ambient_humidity, self.ambient_temperature = Adafruit_DHT.read_retry(sensor, pin)
                except RuntimeError as e:
                    print("Reading from DHT failure: ", e.args)

    def psUtilGetStats(self):
        #temp_average = 0
        temp_sum = 0
        thermal = psutil.sensors_temperatures(fahrenheit=False)
        if "cpu-thermal" in thermal:
            self.cpu_temp = round((thermal["cpu-thermal"][0][1]))
        elif 'coretemp' in thermal:
            for temp in range(0,len(thermal["coretemp"]),1):
                temp_sum = temp_sum+thermal["coretemp"][temp][1]
            self.cpu_temp = temp_sum / len(thermal["coretemp"])
        self.cpu_percent = str(psutil.cpu_percent(interval=None, percpu=False))
        self.virtual_memory_percent = str(psutil.virtual_memory().percent)
        self.disk_usage = str(psutil.disk_usage("/").percent)

    # ~~ StartupPlugin mixin
    def on_after_startup(self):
        self._logger.info("Dashboard started")
        self.timer = RepeatedTimer(3.0, self.send_notifications, run_first=True)
        self.timer.start()
        #Read settings
        self.dht_sensor_pin = self._settings.get(["dhtSensorPin"])
        self.dht_sensor_type = self._settings.get(["dhtSensorType"])

    def send_notifications(self):
        self.psUtilGetStats()
        self.adafruitDhtGetStats()
        self._plugin_manager.send_plugin_message(self._identifier, dict(cpuPercent=str(self.cpu_percent),
                                                                        virtualMemPercent=str(self.virtual_memory_percent),
                                                                        diskUsagePercent=str(self.disk_usage),
                                                                        cpuTemp=str(self.cpu_temp),
                                                                        extrudedFilament=str( round( (sum(self.extruded_filament_arr) + self.extruded_filament) / 1000, 2) ),
                                                                        layerTimes=str(self.layer_times),
                                                                        layerLabels=str(self.layer_labels),
                                                                        printerMessage =str(self.printer_message),
                                                                        ambientHumidity = str(self.ambient_humidity),
                                                                        ambientTemperature = str(self.ambient_temperature)))

    def on_event(self, event, payload):
        if event == "DisplayLayerProgress_layerChanged" or event == "DisplayLayerProgress_fanspeedChanged":
            #self._logger.info("Current Layer: " + payload.get('currentLayer'))
            if int(payload.get('lastLayerDurationInSeconds')) > 0:
                self.layer_times.append(payload.get('lastLayerDurationInSeconds'))
                self.layer_labels.append(int(payload.get('currentLayer')) - 1)

            self._plugin_manager.send_plugin_message(self._identifier, dict(totalLayer=payload.get('totalLayer'),
                                                                            currentLayer=payload.get('currentLayer'),
                                                                            currentHeight=payload.get('currentHeight'), 
                                                                            totalHeightWithExtrusion=payload.get('totalHeightWithExtrusion'), 
                                                                            feedrate=payload.get('feedrate'), 
                                                                            feedrateG0=payload.get('feedrateG0'), 
                                                                            feedrateG1=payload.get('feedrateG1'), 
                                                                            fanspeed=payload.get('fanspeed'), 
                                                                            lastLayerDuration=payload.get('lastLayerDuration'),
                                                                            lastLayerDurationInSeconds=payload.get('lastLayerDurationInSeconds'), 
                                                                            averageLayerDuration=payload.get('averageLayerDuration'),
                                                                            averageLayerDurationInSeconds=payload.get('averageLayerDurationInSeconds')))
        
        if event == "PrintStarted":
            self._logger.info("Print Started: " + payload.get("name", ""))
            del self.layer_times[:]
            del self.layer_labels[:]
            self. extruded_filament = 0.0
            del self.extruded_filament_arr[:]

        if event == Events.FILE_SELECTED:
            self._logger.info("File Selected: " + payload.get("file", ""))
            #TODO: GCODE analysis here


    ##~~ SettingsPlugin mixin
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
            showLayerProgress=False,
            hideHotend=False,
            showFullscreen=True,
            showFilament=True,
            showLayerGraph=False,
            showPrinterMessage=False,
            showSensorInfo=False,
            dhtSensorPin=4,
            dhtSensorType=None
		)

    def on_settings_save(self, data):
        octoprint.plugin.SettingsPlugin.on_settings_save(self, data)
        self.dht_sensor_pin = self._settings.get(["dhtSensorPin"])
        self.dht_sensor_type = self._settings.get(["dhtSensorType"])


    def get_template_configs(self):
        return [ dict(dict(type="tab", custom_bindings=False),
                            type="settings",  custom_bindings=False) ]

    ##~~ AssetPlugin mixin
    def get_assets(self):
        return dict(
            js=["js/dashboard.js", "js/knockout.contextmenu.min.js", "js/chartist.min.js"],
            css=["css/dashboard.css", "css/knockout.contextmenu.min.css", "css/chartist.min.css"],
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
                user="StefanCohen",
                repo="OctoPrint-Dashboard",
                current=self._plugin_version,

                # update method: pip
                pip="https://github.com/StefanCohen/OctoPrint-Dashboard/archive/{target_version}.zip"
            )
        )
    
    def process_gcode(self, comm_instance, phase, cmd, cmd_type, gcode, *args, **kwargs):
        if not gcode:
            return

        elif gcode == "M117":
            if not cmd.startswith("M117 INDICATOR-Layer"):
                self.printer_message = cmd.strip("M117 ")
                self._logger.info("*********** Message: " + self.printer_message)
            else: return

        elif gcode in ("M82", "G90"):
            self.extruder_mode = "absolute"

        elif gcode in ("M83", "G91"):
            self.extruder_mode = "relative"

        elif gcode in ("G92"): #Extruder Reset
            if self.extruder_mode == "absolute": 
                self.extruded_filament_arr.append(self.extruded_filament)
            else: return

        elif gcode in ("G0", "G1"):
            CmdDict = dict ((x,float(y)) for d,x,y in (re.split('([A-Z])', i) for i in cmd.upper().split()))
            if "E" in CmdDict:
                e = float(CmdDict["E"])
                if self.extruder_mode == "absolute": 
                    self.extruded_filament = e
                elif self.extruder_mode == "relative": 
                    self.extruded_filament += e
                else: return

        else:
            return




__plugin_name__ = "Dashboard"

def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = DashboardPlugin()

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
        "octoprint.comm.protocol.gcode.queued": __plugin_implementation__.process_gcode
    }


    
    global __plugin_settings_overlay__
    __plugin_settings_overlay__ = dict(appearance=dict(components=dict(order=dict(tab=["plugin_dashboard",
                                                                                        "temperature",
                                                                                        "control",
                                                                                        "gcodeviewer",
                                                                                        "terminal",
                                                                                        "timelapse"]))))
