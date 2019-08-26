/*
 * View model for OctoPrint-Dashboard
 *
 * Author: Stefan Cohen
 * License: AGPLv3
 */
$(function() {
    function DashboardViewModel(parameters) {
        var self = this;

        // assign the injected parameters, e.g.:
        // self.loginStateViewModel = parameters[0];
        // self.settingsViewModel = parameters[1];
	self.temperatureModel = parameters[0];
	self.printerStateModel = parameters[1];
	self.printerProfilesModel = parameters[2];
	self.connectionModel = parameters[3];

	self.formatTemperature = function(toolName, actual, target) {
            var output = toolName + ": " + _.sprintf("%.1f&deg;C", actual);
        
            if (target) {
                var sign = (target >= actual) ? " \u21D7 " : " \u21D8 ";
                output += sign + _.sprintf("%.1f&deg;C", target);
            }
        
            return output;
        };



    }








    /* view model class, parameters for constructor, container to bind to
     * Please see http://docs.octoprint.org/en/master/plugins/viewmodels.html#registering-custom-viewmodels for more details
     * and a full list of the available options.
     */
    OCTOPRINT_VIEWMODELS.push({
        construct: DashboardViewModel,
        // ViewModels your plugin depends on, e.g. loginStateViewModel, settingsViewModel, ... "connectionViewModel", "printerProfilesViewModel", "printerStateViewModel"
        dependencies: [  "temperatureViewModel", "printerStateViewModel", "printerProfilesViewModel", "connectionViewModel" ],
        // Elements to bind to, e.g. #settings_plugin_dashboard, #tab_plugin_dashboard, ...
        elements: [ "#tab_plugin_dashboard" ]
    });
});
