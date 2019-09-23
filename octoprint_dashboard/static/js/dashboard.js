/*
 * View model for OctoPrint-Dashboard
 *
 * Author: Stefan Cohen
 * License: AGPLv3
 */
$(function() {    
    function DashboardViewModel(parameters) {
        var self = this;

        self.temperatureModel = parameters[0];
        self.printerStateModel = parameters[1];
        self.printerProfilesModel = parameters[2];
        self.connectionModel = parameters[3];
        self.settingsViewModel = parameters[4];
        self.displaylayerprogressViewModel = parameters[5];
        self.controlViewModel = parameters[6];

        
        self.totalLayer = ko.observable("-");
        self.currentLayer = ko.observable("-");
        self.currentHeight = ko.observable("-");
        self.totalHeightWithExtrusion = ko.observable("-");
        self.feedrate = ko.observable("-");
        self.feedrateG0 = ko.observable("-");
        self.feedrateG1 = ko.observable("-");
        self.fanspeed = ko.observable("Off");
        self.lastLayerDuration = ko.observable("-");
        self.averageLayerDuration = ko.observable("-");
        self.getEta = ko.observable();
        self.embedUrl = ko.observable("");

        self.cpuPercent = ko.observable(0);
        self.virtualMemPercent = ko.observable(0);
        self.diskUsagePercent = ko.observable(0);
        self.cpuTemp = ko.observable(0);

        
        //Notify user if displaylayerprogress plugin is not installed
        self.DisplayLayerProgressAvailable = function() {
            if (self.settingsViewModel.settings.plugins.DisplayLayerProgress)
                return;
            else {
                printerDisplay = new PNotify({
                    title: 'Dashboard',
                    type: 'warning',
                    text: 'Can\'t get stats from <a href="https://plugins.octoprint.org/plugins/DisplayLayerProgress/"" target="_blank">DisplayLayerProgress</a>. This plugin is required and provides GCode parsing for Fan Speed, Layer/Height info and Average layer time. Is it installed, enabled and on the latest version?',
                    hide: false
                    });
                return "Warning: Can't get stats from <a href='https://plugins.octoprint.org/plugins/DisplayLayerProgress/' target='_blank'>DisplayLayerProgress</a>. Is it installed, enabled and on the latest version?";                
            }
        };

        // Toggle fullscreen
        self.fullScreen = function() {
            var elem = document.getElementById("dasboardContainer");
            if (elem.requestFullscreen) {
                if (!document.fullscreenElement) {
                    elem.requestFullscreen();
                } else {
                  if (document.exitFullscreen) {
                    document.exitFullscreen(); 
                  }
                }
            } else if (elem.mozRequestFullScreen) { /* Firefox */
                if (!document.mozFullscreenElement) {
                    elem.mozRequestFullScreen();
                } else {
                  if (document.mozExitFullscreen) {
                    document.mozExitFullscreen(); 
                  }
                }
            } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
                if (!document.webkitFullscreenElement) {
                    elem.webkitRequestFullscreen();
                } else {
                  if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen(); 
                  }
                }
            } else if (elem.msRequestFullscreen) { /* IE/Edge */
                if (!document.msFullscreenElement) {
                    elem.msRequestFullscreen();
                } else {
                  if (document.msExitFullscreen) {
                    document.msExitFullscreen(); 
                  }
                }
            }

            return
        }

        //Events from displaylayerprogress Plugin
        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin != "dashboard") {
                return;
                }
            if (data.totalLayer) { self.totalLayer(data.totalLayer); }
            if (data.currentLayer) { self.currentLayer(data.currentLayer); }
            if (data.currentHeight) { self.currentHeight(data.currentHeight); }
            if (data.totalHeightWithExtrusion) { self.totalHeightWithExtrusion(data.totalHeightWithExtrusion); }
            if (data.feedrate) { self.feedrate(data.feedrate); }
            if (data.feedrateG0) { self.feedrateG0(data.feedrateG0); }
            if (data.feedrateG1) { self.feedrateG1(data.feedrateG1); }
            if (data.fanspeed) { self.fanspeed(data.fanspeed); }
            if (data.lastLayerDuration) { self.lastLayerDuration(data.lastLayerDuration); }
            if (data.averageLayerDuration) { self.averageLayerDuration(data.averageLayerDuration); }
            if (data.cpuPercent) { self.cpuPercent(data.cpuPercent); }
            if (data.virtualMemPercent) { self.virtualMemPercent(data.virtualMemPercent); }
            if (data.diskUsagePercent) { self.diskUsagePercent(data.diskUsagePercent); }
            if (data.cpuTemp) { self.cpuTemp(data.cpuTemp); }
        };

        // jneilliii/foosel hack to fix control tab disabling the webcam. Tricks the system by making it think you've switched to the control tab by calling it's onTabChange event and then reverting the internal selectedTab variable back to the dashboard
        self.onTabChange = function(current, previous) {
            if ((current === "#tab_plugin_dashboard") || (current === "#control")) {
                var selected = OctoPrint.coreui.selectedTab;
                OctoPrint.coreui.selectedTab = "#control";
                self.controlViewModel.onTabChange("#control", previous);
                OctoPrint.coreui.selectedTab = selected;
            } else if (previous === "#tab_plugin_dashboard") {
                self.controlViewModel.onTabChange(current, "#control");
            }
        };
        
        // jneilliii/foosel hack to fix control tab disabling the webcam continued
        self.controlViewModel.onBrowserTabVisibilityChange = function(status) {
            if (status) {
                var selected = OctoPrint.coreui.selectedTab;
                OctoPrint.coreui.selectedTab = "#control";
                self.controlViewModel._enableWebcam();
                OctoPrint.coreui.selectedTab = selected;
            } else {
                self.controlViewModel._disableWebcam();
            }
        };

        self.embedUrl = function() { 
            if (self.settingsViewModel.settings.webcam) {
                    return self.settingsViewModel.settings.webcam.streamUrl()
            }
            else return "ERROR: Webcam not enabled in config.";
        };


        self.getEta = function(seconds) { 
            dt = new Date();
            dt.setSeconds( dt.getSeconds() + seconds )
            return dt.toTimeString().split(' ')[0];
        };

        self.formatFanOffset = function(fanSpeed) {
            fanSpeed = fanSpeed.replace("%", "");
            fanSpeed = fanSpeed.replace("-", 1);
            fanSpeed = fanSpeed.replace("Off", 1);
            if (fanSpeed) {
                return 350 * (1 - (fanSpeed / 100));
            }
            else return 0;
        };

        self.formatProgressOffset = function(currentProgress) {
            if (currentProgress) {
                return 339.292 * (1 - (currentProgress / 100));
            }
            else return "0.0";
        };

        self.formatTempOffset = function(temp, range) {
            if (temp) {
                return 350 * (1 - temp / range);
            }
            else return 350;            
        };

        self.formatConnectionstatus = function(currentStatus) {
            if (currentStatus) {
                return "Connected";
            }
            else return "Disconnected";
        };
      };

    // view model class, parameters for constructor, container to bind to
    OCTOPRINT_VIEWMODELS.push({
        construct: DashboardViewModel,
        dependencies: [  "temperatureViewModel", "printerStateViewModel", "printerProfilesViewModel", "connectionViewModel", "settingsViewModel", "displaylayerprogressViewModel", "controlViewModel" ],
        optional: [ "displaylayerprogressViewModel" ],
        elements: [ "#tab_plugin_dashboard" ]
    });
});



