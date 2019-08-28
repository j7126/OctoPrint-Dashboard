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

	self.currentLayer = ko.observable();

	self.currentLayer = 0;

	if (!self.displaylayerprogressViewModel) {
		console.log("displaylayerprogressViewModel is not loaded. Is plugin installed?");
	}


	self.onDataUpdaterPluginMessage = function(plugin, data) {
		if (plugin != "dashboard") {
			return;
			}
		if (data.currentLayer) {
			console.log(data.currentLayer);
           		self.currentLayer = data.currentLayer;
		}
	};


	 self.formatConnectionstatus = function(currentStatus) {
            if (currentStatus) {
		return "Connected";
            }
            else return "Disconnected";
        };
    }

    /* view model class, parameters for constructor, container to bind to  */
    OCTOPRINT_VIEWMODELS.push({
        construct: DashboardViewModel,
        dependencies: [  "temperatureViewModel", "printerStateViewModel", "printerProfilesViewModel", "connectionViewModel", "settingsViewModel", "displaylayerprogressViewModel" ],
	optional: [ "displaylayerprogressViewModel" ],
        elements: [ "#tab_plugin_dashboard" ]
    });
});
