# coding=utf-8
from __future__ import absolute_import
import octoprint.plugin
from octoprint.util import RepeatedTimer
import re
import psutil

from octoprint.events import Events, eventManager

class DashboardPlugin(octoprint.plugin.SettingsPlugin,
                      octoprint.plugin.StartupPlugin,
                      octoprint.plugin.AssetPlugin,
                      octoprint.plugin.TemplatePlugin,
                      octoprint.plugin.EventHandlerPlugin):

    extruded_filament = 0
    cpu_percent = 0
    cpu_temp = 0
    virtual_memory_percent = 0
    disk_usage = 0
    layer_times = []

    def psUtilGetStats(self):
        thermal = psutil.sensors_temperatures(fahrenheit=False)
        self.cpu_temp = round((thermal["cpu-thermal"][0][1]))
        self.cpu_percent = str(psutil.cpu_percent(interval=None, percpu=False))
        self.virtual_memory_percent = str(psutil.virtual_memory().percent)
        self.disk_usage = str(psutil.disk_usage("/").percent)


    def on_after_startup(self):
        self._logger.info("Dashboard started")
        
        self.timer = RepeatedTimer(2.0, self.send_notifications, run_first=True)
        self.timer.start()

    def send_notifications(self):
        self.psUtilGetStats()
        self._plugin_manager.send_plugin_message(self._identifier, dict(cpuPercent=str(self.cpu_percent),
                                                                        virtualMemPercent=str(self.virtual_memory_percent),
                                                                        diskUsagePercent=str(self.disk_usage),
                                                                        cpuTemp=str(self.cpu_temp),
                                                                        extrudedFilament=str(self.extruded_filament),
                                                                        layerTimes=str(self.layer_times)))



    def on_event(self, event, payload):
        if event == "DisplayLayerProgress_layerChanged":
            #self._logger.info("Current Layer: " + payload.get('currentLayer'))

            if int(payload.get('lastLayerDurationInSeconds')) > 0:
                self.layer_times.append(payload.get('lastLayerDurationInSeconds'))

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

        if event == Events.FILE_SELECTED:
            self._logger.info("File Selected: " + payload.get("file", ""))


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
            showFilament=True
		)

    def get_template_configs(self):
        return [ dict(dict(type="tab", custom_bindings=False),
                            type="settings",  custom_bindings=False) ]

    ##~~ AssetPlugin mixin
    def get_assets(self):
        return dict(
            js=["js/dashboard.js", "js/knockout.contextmenu.min.js"],
            css=["css/dashboard.css", "css/knockout.contextmenu.min.css"],
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
        #self._logger.info("GCODE: " + cmd)
        #if cmd.startswith("M117 INDICATOR-Layer"):
            #self._logger.info("LAYER CHANGE")
            #return
        if not gcode:
            return
        elif gcode in ("G0", "G1"):
            CmdDict = dict ((x,float(y)) for d,x,y in (re.split('([A-Z])', i) for i in cmd.upper().split()))
            if "E" in CmdDict:
                e = float(CmdDict["E"]) / 1000 #in meters
                self.extruded_filament = round(e,2)
                return
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
