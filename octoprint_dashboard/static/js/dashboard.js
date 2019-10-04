/*
 * View model for OctoPrint-Dashboard
 *
 * Author: Stefan Cohen
 * License: AGPLv3
 */
$(function () {
    function DashboardViewModel(parameters) {
        var self = this;

        //Viewmodels
        self.temperatureModel = parameters[0];
        self.printerStateModel = parameters[1];
        self.printerProfilesModel = parameters[2];
        self.connectionModel = parameters[3];
        self.settingsViewModel = parameters[4];
        self.displaylayerprogressViewModel = parameters[5];
        self.controlViewModel = parameters[6];

        //Displaylayerprogress vars
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
        self.extrudedFilament = ko.observable(0.00);

        //Dashboard backend vars
        self.cpuPercent = ko.observable(0);
        self.virtualMemPercent = ko.observable(0);
        self.diskUsagePercent = ko.observable(0);
        self.cpuTemp = ko.observable(0);

        //Fullscreen
        self.urlParams = new URLSearchParams(window.location.search);
        var dashboardIsFull = self.urlParams.has('dashboard') && (self.urlParams.get('dashboard') == 'full');

        //Menus
        self.connectionMenu = ko.observableArray([
            { text: self.connectionModel.buttonText, action: self.connectionModel.connect }
        ]);

        self.jobMenu = ko.observableArray([
            { text: 'Pause', action: self.printerStateModel.onlyPause },
            { text: 'Cancel', action: self.printerStateModel.cancel }
        ]);



        //Notify user if displaylayerprogress plugin is not installed
        self.DisplayLayerProgressAvailable = function () {
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
        self.fullScreen = function () {
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

        //getting fullscreen background color from theme
        // TODO: make this less of a hack 
        if (!dashboardIsFull) {
            document.onfullscreenchange = function (event) {
                if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                    var elem = document.getElementById("dasboardContainer");
                    if (elem.requestFullscreen) {
                        if (!document.fullscreenElement) {
                            $('#dasboardContainer').css('background-color', '');
                            $('#dasboardContainer').css('color', '');
                            $('#tab_plugin_dashboard').css('background-color', '');
                            $('#tabs_content').css('background-color', '');
                            $('div.tabbable').css('background-color', '');
                            $('div.row').css('background-color', '');
                            $('div.octoprint-container').css('background-color', '');
                            $('div.page-container').css('background-color', '');
                        } else {
                            document.getElementById('dasboardContainer').style.setProperty('color', 'inherit', 'important');
                            $('#dasboardContainer').css('background-color', 'inherit');
                            $('#tab_plugin_dashboard').css('background-color', 'inherit');
                            $('#tabs_content').css('background-color', 'inherit');
                            $('div.tabbable').css('background-color', 'inherit');
                            $('div.row').css('background-color', 'inherit');
                            $('div.octoprint-container').css('background-color', 'inherit');
                            $('div.page-container').css('background-color', 'inherit');
                        }
                    } else if (elem.mozRequestFullScreen) { /* Firefox */
                        if (!document.mozFullscreenElement) {
                            $('#dasboardContainer').css('background-color', '');
                            $('#dasboardContainer').css('color', '');
                            $('#tab_plugin_dashboard').css('background-color', '');
                            $('#tabs_content').css('background-color', '');
                            $('div.tabbable').css('background-color', '');
                            $('div.row').css('background-color', '');
                            $('div.octoprint-container').css('background-color', '');
                            $('div.page-container').css('background-color', '');
                        } else {
                            document.getElementById('dasboardContainer').style.setProperty('color', 'inherit', 'important');
                            $('#dasboardContainer').css('background-color', 'inherit');
                            $('#tab_plugin_dashboard').css('background-color', 'inherit');
                            $('#tabs_content').css('background-color', 'inherit');
                            $('div.tabbable').css('background-color', 'inherit');
                            $('div.row').css('background-color', 'inherit');
                            $('div.octoprint-container').css('background-color', 'inherit');
                            $('div.page-container').css('background-color', 'inherit');
                        }
                    }
                    // webkit is not needed for fullscreen. see https://developer.mozilla.org/en-US/docs/Web/API/Document/onfullscreenchange#Browser_compatibility
                }
            };
            document.onmozfullscreenchange = function (event) { /* firefox */
                if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                    var elem = document.getElementById("dasboardContainer");
                    if (elem.requestFullscreen) {
                        if (!document.fullscreenElement) {
                            $('#dasboardContainer').css('background-color', '');
                            $('#dasboardContainer').css('color', '');
                            $('#tab_plugin_dashboard').css('background-color', '');
                            $('#tabs_content').css('background-color', '');
                            $('div.tabbable').css('background-color', '');
                            $('div.row').css('background-color', '');
                            $('div.octoprint-container').css('background-color', '');
                            $('div.page-container').css('background-color', '');
                        } else {
                            document.getElementById('dasboardContainer').style.setProperty('color', 'inherit', 'important');
                            $('#dasboardContainer').css('background-color', 'inherit');
                            $('#tab_plugin_dashboard').css('background-color', 'inherit');
                            $('#tabs_content').css('background-color', 'inherit');
                            $('div.tabbable').css('background-color', 'inherit');
                            $('div.row').css('background-color', 'inherit');
                            $('div.octoprint-container').css('background-color', 'inherit');
                            $('div.page-container').css('background-color', 'inherit');
                        }
                    } else if (elem.mozRequestFullScreen) { /* Firefox */
                        if (!document.mozFullscreenElement) {
                            $('#dasboardContainer').css('background-color', '');
                            $('#dasboardContainer').css('color', '');
                            $('#tab_plugin_dashboard').css('background-color', '');
                            $('#tabs_content').css('background-color', '');
                            $('div.tabbable').css('background-color', '');
                            $('div.row').css('background-color', '');
                            $('div.octoprint-container').css('background-color', '');
                            $('div.page-container').css('background-color', '');
                        } else {
                            document.getElementById('dasboardContainer').style.setProperty('color', 'inherit', 'important');
                            $('#dasboardContainer').css('background-color', 'inherit');
                            $('#tab_plugin_dashboard').css('background-color', 'inherit');
                            $('#tabs_content').css('background-color', 'inherit');
                            $('div.tabbable').css('background-color', 'inherit');
                            $('div.row').css('background-color', 'inherit');
                            $('div.octoprint-container').css('background-color', 'inherit');
                            $('div.page-container').css('background-color', 'inherit');
                        }
                    }
                }
            };
            document.onMSfullscreenchange = function (event) { /* for IE */
                if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                    var elem = document.getElementById("dasboardContainer");
                    if (elem.msRequestFullscreen) { /* IE/Edge */
                        if (!document.msFullscreenElement) {
                            $('#dasboardContainer').css('background-color', '');
                            $('#dasboardContainer').css('color', '');
                            $('#tab_plugin_dashboard').css('background-color', '');
                            $('#tabs_content').css('background-color', '');
                            $('div.tabbable').css('background-color', '');
                            $('div.row').css('background-color', '');
                            $('div.octoprint-container').css('background-color', '');
                            $('div.page-container').css('background-color', '');
                        } else {
                            document.getElementById('dasboardContainer').style.setProperty('color', 'inherit', 'important');
                            $('#dasboardContainer').css('background-color', 'inherit');
                            $('#tab_plugin_dashboard').css('background-color', 'inherit');
                            $('#tabs_content').css('background-color', 'inherit');
                            $('div.tabbable').css('background-color', 'inherit');
                            $('div.row').css('background-color', 'inherit');
                            $('div.octoprint-container').css('background-color', 'inherit');
                            $('div.page-container').css('background-color', 'inherit');
                        }
                    }
                }
            };
        }

        //Events from displaylayerprogress Plugin
        self.onDataUpdaterPluginMessage = function (plugin, data) {
            if (plugin != "dashboard") {
                return;
            }
            else {
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
                if (data.extrudedFilament) { self.extrudedFilament(data.extrudedFilament); }
                if (data.layerTimes && data.layerLabels) { self.renderChart(data.layerTimes, data.layerLabels); }
            }
        };

        self.embedUrl = function () {
            if (self.settingsViewModel.settings.webcam && self.settingsViewModel.settings.plugins.dashboard.showWebCam) {
                return self.settingsViewModel.settings.webcam.streamUrl() + "?" + new Date().getTime();
            }
            else return "";
        };

        self.getEta = function (seconds) {
            dt = new Date();
            dt.setSeconds(dt.getSeconds() + seconds)
            return dt.toTimeString().split(' ')[0];
        };

        self.formatFanOffset = function (fanSpeed) {
            fanSpeed = fanSpeed.replace("%", "");
            fanSpeed = fanSpeed.replace("-", 1);
            fanSpeed = fanSpeed.replace("Off", 1);
            if (fanSpeed) {
                return 350 * (1 - (fanSpeed / 100));
            }
            else return 0;
        };

        self.formatProgressOffset = function (currentProgress) {
            if (currentProgress) {
                return 339.292 * (1 - (currentProgress / 100));
            }
            else return "0.0";
        };

        self.formatTempOffset = function (temp, range) {
            if (temp) {
                return 350 * (1 - temp / range);
            }
            else return 350;
        };

        self.formatConnectionstatus = function (currentStatus) {
            if (currentStatus) {
                return "Connected";
            }
            else return "Disconnected";
        };

        self.renderChart = function (layerTimes, layerLabels) {
            //console.log(layerTimes);
            //console.log(layerLabels);

            //create a prototype multi-dimensional array
            var data = {
                labels: [],
                series: [
                    []
                ]
            };

            //Prep the data
            var values = JSON.parse(layerTimes);
            var labels = JSON.parse(layerLabels);
            for (var i = 0; i < values.length; i += 1){
                data.series[0].push(values[i])
              }
            for (var i = 0; i < labels.length; i += 1){
                data.labels.push(labels[i])
              }

            //Chart Options
            var options = {
                onlyInteger: true,
                showPoint: false,
                lineSmooth: true,
                fullWidth: true,
                //showArea: true,
                width: '100%',
                height: '150px',
                axisX: {
                    showGrid: false,
                    showLabel: true,
                    labelInterpolationFnc: function skipLabels(value, index, labels) {
                        let labelScale = Math.round( ( labels.length + 60 ) / 10 );
                        if(labels.length > 40) {
                            return index % labelScale  === 0 ? value : null;
                        } else {
                            return value;
                        }
                    }
                }
            };
            //TODO: Create the chart on onStartupComplete and use the update method instead of re-drawing the entire chart for every event. 
            var chart = new Chartist.Line('.ct-chart', data, options );
        };

        // full page
        if (dashboardIsFull) {
            var dashboardFullLoaderHtml = '<div class="dashboardFullLoader">Please Wait...</div>';
            $('body').append(dashboardFullLoaderHtml);
        }
        self.onStartupComplete = function () {
            if (dashboardIsFull) {
                $('#dasboardContainer').addClass('dashboard-full');
                $('body').css('overflow', 'hidden');
                $('.dashboardFullLoader').css('display', 'none');
                if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                    document.getElementById('dasboardContainer').style.setProperty('color', 'inherit', 'important');
                    $('#dasboardContainer').css('background-color', 'inherit');
                    $('#tab_plugin_dashboard').css('background-color', 'inherit');
                    $('#tabs_content').css('background-color', 'inherit');
                    $('div.tabbable').css('background-color', 'inherit');
                    $('div.row').css('background-color', 'inherit');
                    $('div.octoprint-container').css('background-color', 'inherit');
                    $('div.page-container').css('background-color', 'inherit');
                }
            }

        }

    };

    // view model class, parameters for constructor, container to bind to
    OCTOPRINT_VIEWMODELS.push({
        construct: DashboardViewModel,
        dependencies: ["temperatureViewModel", "printerStateViewModel", "printerProfilesViewModel", "connectionViewModel", "settingsViewModel", "displaylayerprogressViewModel", "controlViewModel"],
        optional: ["displaylayerprogressViewModel"],
        elements: ["#tab_plugin_dashboard"]
    });
});



