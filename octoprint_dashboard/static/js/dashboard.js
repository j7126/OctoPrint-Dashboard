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
                    text: 'Can\'t get stats from <a href="https://plugins.octoprint.org/plugins/DisplayLayerProgress/"" target="_blank">DisplayLayerprogress</a>. This plugin is required and provides GCode parsing for Fan Speed, Layer/Height info and Average layer time. Is it installed, enabled and on the latest version?',
                    hide: false
                    });
                return "Can't get stats from <a href='https://plugins.octoprint.org/plugins/DisplayLayerProgress/' target='_blank'>DisplayLayerprogress</a>. Is it installed, enabled and on the latest version?";                
            }
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

        self.embedUrl = function() { //TODO: This is a hack. Should be replaced with the webcam view from the control page but I haven't succeeded yet.
            if (self.settingsViewModel.settings.webcam) {
                if (self.settingsViewModel.settings.webcam.streamUrl().startsWith("http")) {
                    return self.settingsViewModel.settings.webcam.streamUrl();
                }
                else {
                    return window.location.origin + self.settingsViewModel.settings.webcam.streamUrl()
                }
            }
            else return "ERROR: Webcam utl not defined.";
        }

        self.getEta = function(seconds) { 
            dt = new Date();
            dt.setSeconds( dt.getSeconds() + seconds )
            return dt.toTimeString().split(' ')[0];
        }

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
        dependencies: [  "temperatureViewModel", "printerStateViewModel", "printerProfilesViewModel", "connectionViewModel", "settingsViewModel", "displaylayerprogressViewModel" ],
        optional: [ "displaylayerprogressViewModel" ],
        elements: [ "#tab_plugin_dashboard" ]
    });
});
