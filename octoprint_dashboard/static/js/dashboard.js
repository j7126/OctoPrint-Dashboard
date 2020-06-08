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
        self.gcodeViewModel = parameters[7];
        self.enclosureViewModel = parameters[8];

        //Displaylayerprogress vars
        self.totalLayer = ko.observable("-");
        self.currentLayer = ko.observable("-");
        self.currentHeight = ko.observable("-");
        self.totalHeight = ko.observable("-");
        self.feedrate = ko.observable("-");
        self.feedrateG0 = ko.observable("-");
        self.feedrateG1 = ko.observable("-");
        self.fanspeed = ko.observable("Off");
        self.lastLayerDuration = ko.observable("-");
        self.lastLayerDurationInSeconds = ko.observable("-");
        self.averageLayerDuration = ko.observable("-");
        self.averageLayerDurationInSeconds = ko.observable("-");
        self.changeFilamentTimeLeftInSeconds = ko.observable("-");
        self.changeFilamentCount = ko.observable("-");

        //Dashboard backend vars
        self.getEta = ko.observable();
        self.extrudedFilament = ko.observable(0.00);
        self.layerProgressString = ko.observable(0);
        self.layerProgressBarString = ko.observable("0%");
        self.printerMessage = ko.observable("");
        self.cpuPercent = ko.observable(0);
        self.cpuFreq = ko.observable(0);
        self.virtualMemPercent = ko.observable(0);
        self.diskUsagePercent = ko.observable(0);
        self.cpuTemp = ko.observable(0);
        self.commandWidgetArray = ko.observableArray();
        self.cmdResults = ko.observableArray("");
        self.webcamState = ko.observable();
        self.dashboardMulticamProfiles = ko.observableArray();


        //Scale down the file name if it is too long to fit one line #This should probably be placed somewhere else 
        self.fitties = fitty('#fileInfo', { minSize: 5, maxSize: 20 });

        //Fullscreen
        self.urlParams = new URLSearchParams(window.location.search);
        var dashboardIsFull = self.urlParams.has('dashboard') && (self.urlParams.get('dashboard') == 'full');

        //Notify user if displaylayerprogress plugin is not installed
        self.DisplayLayerProgressAvailable = function () {
            if (self.settingsViewModel.settings.plugins.DisplayLayerProgress)
                return true;
            else if (self.settingsViewModel.settings.plugins.dashboard.supressDlpWarning())
                return true;
            else {
                printerDisplay = new PNotify({
                    title: 'Dashboard',
                    type: 'warning',
                    text: 'Can\'t get stats from <a href="https://plugins.octoprint.org/plugins/DisplayLayerProgress/"" target="_blank">DisplayLayerProgress</a>. This plugin is required and provides GCode parsing for Fan Speed, Layer/Height info, Layer Durations and Average layer time. Is it installed, enabled and on the latest version?',
                    hide: false
                });
                return false; 
            }
        };


        self.toggleFullBrowserWindow = function () {
            if (!dashboardIsFull) {
                //location.href="/#tab_plugin_dashboard/?dashboard=full";
                history.replaceState(null, null, ' ');
                self.urlParams.set('dashboard', 'full');
                window.location.search = self.urlParams;
                }
            else {
                self.urlParams.delete('dashboard');
                window.location.search = self.urlParams;
                //self.urlParams.delete('dashboard');
               } 
        }


        // Toggle fullscreen
        self.fullScreen = function () {
            var elem = document.body;
            if (elem.requestFullscreen) {
                if (!document.fullscreenElement) {
                    elem.requestFullscreen();
                    $('#dasboardContainer').addClass('dashboard-full');
                    $('body').css('overflow', 'hidden');
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
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                        if (!dashboardIsFull) {
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
                            if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                                $('#dasboardContainer').css('background-color', '');
                                $('#dasboardContainer').css('color', '');
                                $('#tab_plugin_dashboard').css('background-color', '');
                                $('#tabs_content').css('background-color', '');
                                $('div.tabbable').css('background-color', '');
                                $('div.row').css('background-color', '');
                                $('div.octoprint-container').css('background-color', '');
                                $('div.page-container').css('background-color', '');
                            }
                        }
                    }
                }
            } else if (elem.mozRequestFullScreen) { /* Firefox */
                if (!document.mozFullscreenElement) {
                    elem.mozRequestFullScreen();
                    $('#dasboardContainer').addClass('dashboard-full');
                    $('body').css('overflow', 'hidden');
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
                } else {
                    if (document.mozExitFullscreen) {
                        document.mozExitFullscreen();
                        if (!dashboardIsFull) {
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
                            if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                                $('#dasboardContainer').css('background-color', '');
                                $('#dasboardContainer').css('color', '');
                                $('#tab_plugin_dashboard').css('background-color', '');
                                $('#tabs_content').css('background-color', '');
                                $('div.tabbable').css('background-color', '');
                                $('div.row').css('background-color', '');
                                $('div.octoprint-container').css('background-color', '');
                                $('div.page-container').css('background-color', '');
                            }
                        }
                    }
                }
            } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
                if (!document.webkitFullscreenElement) {
                    elem.webkitRequestFullscreen();
                    $('#dasboardContainer').addClass('dashboard-full');
                    $('body').css('overflow', 'hidden');
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
                } else {
                    if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                        if (!dashboardIsFull) {
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
                            if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                                $('#dasboardContainer').css('background-color', '');
                                $('#dasboardContainer').css('color', '');
                                $('#tab_plugin_dashboard').css('background-color', '');
                                $('#tabs_content').css('background-color', '');
                                $('div.tabbable').css('background-color', '');
                                $('div.row').css('background-color', '');
                                $('div.octoprint-container').css('background-color', '');
                                $('div.page-container').css('background-color', '');
                            }
                        }
                    }
                }
            } else if (elem.msRequestFullscreen) { /* IE/Edge */
                if (!document.msFullscreenElement) {
                    elem.msRequestFullscreen();
                    $('#dasboardContainer').addClass('dashboard-full');
                    $('body').css('overflow', 'hidden');
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
                } else {
                    if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                        if (!dashboardIsFull) {
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
                            if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                                $('#dasboardContainer').css('background-color', '');
                                $('#dasboardContainer').css('color', '');
                                $('#tab_plugin_dashboard').css('background-color', '');
                                $('#tabs_content').css('background-color', '');
                                $('div.tabbable').css('background-color', '');
                                $('div.row').css('background-color', '');
                                $('div.octoprint-container').css('background-color', '');
                                $('div.page-container').css('background-color', '');
                            }
                        }
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
                    var elem = document.body;
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
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
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
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
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
                else {
                    var elem = document.body;
                    if (elem.requestFullscreen) {
                        if (!document.fullscreenElement) {
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
                        }
                    } else if (elem.mozRequestFullScreen) { /* Firefox */
                        if (!document.mozFullscreenElement) {
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
                        }
                    }
                }
            };
            document.onmozfullscreenchange = function (event) { /* firefox */
                if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                    var elem = document.body;
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
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
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
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
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
                else {
                    var elem = document.body;
                    if (elem.requestFullscreen) {
                        if (!document.fullscreenElement) {
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
                        }
                    } else if (elem.mozRequestFullScreen) { /* Firefox */
                        if (!document.mozFullscreenElement) {
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
                        }
                    }
                }
            };
            document.onMSfullscreenchange = function (event) { /* for IE */
                if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                    var elem = document.body;
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
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
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
                else {
                    var elem = document.body;
                    if (elem.requestFullscreen) {
                        if (!document.fullscreenElement) {
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
                        }
                    } else if (elem.mozRequestFullScreen) { /* Firefox */
                        if (!document.mozFullscreenElement) {
                            $('#dasboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
                        }
                    }
                }
            };
        }

        //Events from displaylayerprogress Plugin
        self.onDataUpdaterPluginMessage = function (plugin, data) {
            if (plugin == "dashboard") {
                if (data.totalLayer) { self.totalLayer(data.totalLayer); }
                if (data.currentLayer) { self.currentLayer(data.currentLayer); }
                if (data.currentHeight) { self.currentHeight(data.currentHeight); }
                if (data.totalHeight) { self.totalHeight(data.totalHeight); }
                if (data.feedrate) { self.feedrate(data.feedrate); }
                if (data.feedrateG0) { self.feedrateG0(data.feedrateG0); }
                if (data.feedrateG1) { self.feedrateG1(data.feedrateG1); }
                if (data.fanspeed) { self.fanspeed(data.fanspeed); }
                if (data.lastLayerDuration) { self.lastLayerDuration(data.lastLayerDuration); }
                if (data.lastLayerDurationInSeconds) { self.lastLayerDurationInSeconds(data.lastLayerDurationInSeconds); }
                if (data.averageLayerDuration) { self.averageLayerDuration(data.averageLayerDuration); }
                if (data.averageLayerDurationInSeconds) { self.averageLayerDurationInSeconds(data.averageLayerDurationInSeconds); }
                if (data.changeFilamentTimeLeftInSeconds) { self.changeFilamentTimeLeftInSeconds(data.changeFilamentTimeLeftInSeconds); }
                if (data.changeFilamentCount) { self.changeFilamentCount(data.changeFilamentCount); }
                if (data.cpuPercent) { self.cpuPercent(data.cpuPercent); }
                if (data.cpuFreq) { self.cpuFreq(data.cpuFreq); }
                if (data.virtualMemPercent) { self.virtualMemPercent(data.virtualMemPercent); }
                if (data.diskUsagePercent) { self.diskUsagePercent(data.diskUsagePercent); }
                if (data.cpuTemp) { self.cpuTemp(data.cpuTemp); }
                if (data.printerMessage) { self.printerMessage(data.printerMessage); }
                if (data.extrudedFilament) { self.extrudedFilament(data.extrudedFilament); }
                if (data.layerTimes && data.layerLabels) { self.renderChart(data.layerTimes, data.layerLabels); }
                if (data.printStarted) { self.printStarted(); }
                if (data.cmdResults) { self.cmdResults( JSON.parse(data.cmdResults)) ; }
            }
            else return;
        };


        self.printStarted = function () {
            //TODO: Clear vars from previous print to reset UI.
            return;
        };

        self.cpuTempColor = function () {
            if (self.cpuTemp() >= self.settingsViewModel.settings.plugins.dashboard.cpuTempCriticalThreshold()) {
                return "red";
            }
            else if (self.cpuTemp() >= self.settingsViewModel.settings.plugins.dashboard.cpuTempWarningThreshold()) {
                return "orange";
            }
            else if (self.cpuTemp() < self.settingsViewModel.settings.plugins.dashboard.cpuTempWarningThreshold()) {
                return "#08c";
            }
        }

        self.tempColor = function (actual, target) {
            if (self.settingsViewModel.settings.plugins.dashboard.showTempGaugeColors() == true) {
                if (target == 0) {
                    return "#08c";
                }
                else if (parseInt(target) > 0) {
                    if (parseInt(actual) < parseInt(target) - parseInt(self.settingsViewModel.settings.plugins.dashboard.targetTempDeviation()) ) {
                        //console.log("Less than set temp!");
                        return "#08c"; //blue   
                    }
                    else if (parseInt(actual) > parseInt(target) + parseInt(self.settingsViewModel.settings.plugins.dashboard.targetTempDeviation()) ) {
                        //console.log("Above set temp!");
                        return "#ff3300"; //red   
                    }
                    else return "#28b623"; //green

                }
            }
            else return "#08c";
        }


        
        self.onBeforeBinding = function() {
            if(self.MulticamAvailable()) {
                self.dashboardMulticamProfiles(self.settingsViewModel.settings.plugins.multicam.multicam_profiles());
                self.dashboardMulticamProfiles.reverse();
            }
            self.commandWidgetArray(self.settingsViewModel.settings.plugins.dashboard.commandWidgetArray());
        };

        self.MulticamAvailable = function () {
            if (self.settingsViewModel.settings.plugins.multicam) {
                return true;
            }
            return false; 
        };

        self.toggleWebcam = function () {
            if (self.webcamState() == 0) {
                self.webcamState(1);
            } else {
                self.webcamState(0);
            }
        };

        self.embedUrl = function () {                     
            if (self.webcamState() > 0 && self.settingsViewModel.settings.webcam && self.settingsViewModel.settings.plugins.dashboard.showWebCam() == true) {
                if(self.MulticamAvailable()) {
                    var urlPosition = self.webcamState() - 1;
                    return self.dashboardMulticamProfiles()[urlPosition].URL() + '?' + new Date().getTime();
                } else {
                    return self.settingsViewModel.settings.webcam.streamUrl() + '?' + new Date().getTime();
                }
            }
            else if (self.webcamState() == 0 || self.settingsViewModel.settings.plugins.dashboard.showWebCam() == false) {
                $("#dashboard_webcam_image").attr("src", "");
                return "";
            }
            else return;
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

        self.addCommandWidget = function () {
            console.log("Adding command Widget");
            self.settingsViewModel.settings.plugins.dashboard.commandWidgetArray.push({icon: ko.observable('command-icon.png'),name: ko.observable(''), command: ko.observable('')});
            self.commandWidgetArray(self.settingsViewModel.settings.plugins.dashboard.commandWidgetArray());
        };

        self.removeCommandWidget = function (command) {
            console.log("Removing Command Widget");
            self.settingsViewModel.settings.plugins.dashboard.commandWidgetArray.remove(command);
            self.commandWidgetArray(self.settingsViewModel.settings.plugins.dashboard.commandWidgetArray());
        };

        var gcodeLayerCommands = 1;
        var oldGcodeViewModel_processData = self.gcodeViewModel._processData;
        self.gcodeViewModel._processData = function (data) {
            if (self.gcodeViewModel.loadedFilepath
                && self.gcodeViewModel.loadedFilepath === data.job.file.path
                && self.gcodeViewModel.loadedFileDate === data.job.file.date) {
                if (self.gcodeViewModel.currentlyPrinting) {
                    var cmdIndex = GCODE.gCodeReader.getCmdIndexForPercentage(data.progress.completion);
                    if (!cmdIndex) return;
                    self.layerProgressString((cmdIndex.cmd / gcodeLayerCommands) * 100);
                    self.layerProgressBarString(Math.round((cmdIndex.cmd / gcodeLayerCommands) * 100) + "%");
                }
            }
            return oldGcodeViewModel_processData.apply(oldGcodeViewModel_processData, [data]);
        }
        var oldGcodeViewModel_onLayerSelected = self.gcodeViewModel._onLayerSelected;
        self.gcodeViewModel._onLayerSelected = function (layer) {
            if (layer) {
                gcodeLayerCommands = layer.commands;
            }
            return oldGcodeViewModel_onLayerSelected.apply(oldGcodeViewModel_onLayerSelected, [layer]);
        }
        self.layerProgrogress_onTabChange = function () {
            return;
            // see the function inside onstartupcomplete
        }
        // getting layer progress from gcode view model 
        self.onTabChange = function (current, previous) {
            self.layerProgrogress_onTabChange(current, previous);
            self.lastTab = previous;
        };

        self.renderChart = function (layerTimes, layerLabels) {
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
            for (var i = 0; i < values.length; i += 1) {
                data.series[0].push(values[i])
            }
            for (var i = 0; i < labels.length; i += 1) {
                data.labels.push(labels[i])
            }

            //Chart Options
            var options = {
                onlyInteger: true,
                showPoint: false,
                lineSmooth: true,
                fullWidth: true,
                width: '100%',
                height: '150px',
                axisX: {
                    showGrid: false,
                    showLabel: true,
                    labelInterpolationFnc: function skipLabels(value, index, labels) {
                        let labelScale = Math.round((labels.length + 60) / 10);
                        if (labels.length > 40) {
                            return index % labelScale === 0 ? value : null;
                        } else {
                            return value;
                        }
                    }
                }
            };
            //TODO: Create the chart on onStartupComplete and use the update method instead of re-drawing the entire chart for every event. 
            var chart = new Chartist.Line('.ct-chart', data, options);
        };

        // full page
        if (dashboardIsFull) {
            var dashboardFullLoaderHtml = '<div class="dashboardFullLoader">Please Wait...</div>';
            $('body').append(dashboardFullLoaderHtml);
        }

        // startup complete
        self.onStartupComplete = function () {
            // full page
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

            if (self.settingsViewModel.settings.plugins.dashboard.showLayerProgress()) {
                self.gcodeViewModel.tabActive = true;
                setTimeout(() => {
                    self.gcodeViewModel.tabActive = true;
                }, 100);
            }

            self.layerProgrogress_onTabChange = function (current, previous) {
                setTimeout(() => {
                    if (self.settingsViewModel.settings.plugins.dashboard.showLayerProgress()) {
                        self.gcodeViewModel.tabActive = true;
                    }
                }, 50);
            };

            self.printerStateModel.isPrinting.subscribe(function (newValue) {
                //wait for things to laod
                setTimeout(() => {
                    if (self.settingsViewModel.settings.plugins.dashboard.showLayerProgress()) {
                        if (newValue === true) {
                            if (self.gcodeViewModel.needsLoad) {
                                self.gcodeViewModel.loadFile(self.gcodeViewModel.selectedFile.path(), self.gcodeViewModel.selectedFile.date());
                            }
                        }
                    }
                }, 100);
            });

            self.settingsViewModel.settings.plugins.dashboard.showLayerProgress.subscribe(function (newValue) {
                setTimeout(() => {
                    if (newValue === true) {
                        self.gcodeViewModel.tabActive = true;
                        if (self.gcodeViewModel.needsLoad) {
                            self.gcodeViewModel.loadFile(self.gcodeViewModel.selectedFile.path(), self.gcodeViewModel.selectedFile.date());
                        }
                    }
                }, 5);
            });
            
            self.webcamState(1);
        }

    };

    // view model class, parameters for constructor, container to bind to
    OCTOPRINT_VIEWMODELS.push({
        construct: DashboardViewModel,
        dependencies: ["temperatureViewModel", "printerStateViewModel", "printerProfilesViewModel", "connectionViewModel", "settingsViewModel", "displaylayerprogressViewModel", "controlViewModel", "gcodeViewModel", "enclosureViewModel"],
        optional: ["displaylayerprogressViewModel", "enclosureViewModel"],
        elements: ["#tab_plugin_dashboard", "#settings_plugin_dashboard"]
    });

});


