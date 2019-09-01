/*
 * View model for OctoPrint-Dashboard
 *
 * Author: Stefan Cohen
 * License: AGPLv3
 */
$(function() {
    function DashboardViewModel(parameters) {
        var self = this;

        // self.loginStateViewModel = parameters[0];
        // self.settingsViewModel = parameters[1];
        self.temperatureModel = parameters[0];
        self.printerStateModel = parameters[1];
        self.printerProfilesModel = parameters[2];
        self.connectionModel = parameters[3];
        self.settingsViewModel = parameters[4];
        self.displaylayerprogressViewModel = parameters[5];

        self.totalLayer = ko.observable("-");
        self.currentLayer = ko.observable(0);
        self.currentHeight = ko.observable("-");
        self.totalHeightWithExtrusion = ko.observable("-");
        self.feedrate = ko.observable("-");
        self.feedrateG0 = ko.observable("-");
        self.feedrateG1 = ko.observable("-");
        self.fanspeed = ko.observable("-");
        self.lastLayerDuration = ko.observable("-");
        self.averageLayerDuration = ko.observable("-");

        
        //Notify user if displaylayerprogress plugin is not installed
        if (!self.displaylayerprogressViewModel) {
            //TODO: Display in UI instead of console log.
            console.log("displaylayerprogressViewModel is not loaded. Is plugin installed?");
        }

        //Events from displaylayerprogress Plugin
        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin != "dashboard") {
                return;
                }
            if (data.totalLayer) { self.totalLayer( parseInt(data.totalLayer) + 1); }
            //if (data.totalLayer) { self.totalLayer( parseInt(data.totalLayer) + 1); }
            if (data.currentLayer) { self.currentLayer(parseInt(data.currentLayer) + 1); }
            if (data.currentHeight) { self.currentHeight(data.currentHeight); }
            if (data.totalHeightWithExtrusion) { self.totalHeightWithExtrusion(data.totalHeightWithExtrusion + "mm"); }
            if (data.feedrate) { self.feedrate(data.feedrate); }
            if (data.feedrateG0) { self.feedrateG0(data.feedrateG0); }
            if (data.feedrateG1) { self.feedrateG1(data.feedrateG1); }
            if (data.fanspeed) { self.fanspeed(data.fanspeed); }
            if (data.lastLayerDuration) { self.lastLayerDuration(data.lastLayerDuration); }
            if (data.averageLayerDuration) { self.averageLayerDuration(data.averageLayerDuration); }
        };


        

        self.formatTime = function strip(str) {
            str = str.replace("days", "d");
            str = str.replace("hours", "h");
            str = str.replace("minutes", "m");
            str = str.replace("seconds", "s");
            return str;
        }


        self.formatFanOffset = function(fanSpeed) {
            fanSpeed = fanSpeed.replace("%", "");
            fanSpeed = fanSpeed.replace("-", 1);
            //console.log("Fanspeed: " + fanSpeed);
            if (fanSpeed) {
                //console.log(350 * (1 - (fanSpeed / 100)) );
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
