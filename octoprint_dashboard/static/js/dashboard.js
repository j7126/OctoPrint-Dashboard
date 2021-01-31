/*
 * View model for OctoPrint-Dashboard
 *
 * Authors: Stefan Cohen, j7126, Willmac16, CynanX
 * License: AGPLv3
 */
$(function() {
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
        self.loginState = parameters[9];

        //Displaylayerprogress vars
        self.totalLayer = ko.observable("-");
        self.currentLayer = ko.observable("-");
        self.currentHeight = ko.observable("-");
        self.totalHeight = ko.observable("-");
        self.feedrateG0 = ko.observable("-");
        self.feedrateG1 = ko.observable("-");
        self.fanspeed = ko.observable("Off");
        self.lastLayerDuration = ko.observable("-");
        self.lastLayerDurationInSeconds = ko.observable("-");
        self.averageLayerDuration = ko.observable("-");
        self.averageLayerDurationInSeconds = ko.observable("-");
        self.changeFilamentTimeLeft = ko.observable("-");
        self.changeFilamentCount = ko.observable("-");

        self.feedrate = ko.observable(0);
        self.feedrateAv = ko.observable(0);
        self.feedrateAvNo = ko.observable(0);
        self.feedrateAvLastFiveSeconds = ko.observable(0);
        self.feedrateAvNoLastFiveSeconds = ko.observable(0);

        //Dashboard backend vars
        self.getEta = ko.observable();
        self.extrudedFilament = ko.observable(0.00);
        self.timeProgressString = ko.observable(0.01);
        self.timeProgressBarString = ko.observable("0%");
        self.heightProgressString = ko.observable(0.01);
        self.heightProgressBarString = ko.observable("0%");
        self.layerProgressString = ko.observable(0);
        self.layerProgressBarString = ko.observable("0%");
        self.printerMessage = ko.observable("");
        self.cpuPercent = ko.observable(0);
        self.cpuFreq = ko.observable(0);
        self.virtualMemPercent = ko.observable(0);
        self.diskUsagePercent = ko.observable(0);
        self.cpuTemp = ko.observable(0);
        self.commandWidgetArray = ko.observableArray();
        self.cmdResults = ko.observableArray();
        self.webcamState = ko.observable(1);
        self.rotate = ko.observable(0);
        self.flipH = ko.observable(0);
        self.flipV = ko.observable(0);
        self.isFull = ko.observable(false);
        self.isTabVisible = ko.observable(false);

        // Gauge Rendering vars
        self.tempGaugeAngle = ko.observable(260);
        self.tempGaugeRadius = ko.observable(77);
        self.tempGaugeOffset = ko.observable(53);
        self.tempGaugeTicks = ko.observableArray([0.0, 0.25, 0.5, 0.75, 1.0]);

        self.admin = ko.observableArray(false);
        self.webcam_perm = ko.observable(false);

        self.fsSystemInfo = ko.computed(() => this.isFull() && this.settingsViewModel.settings.plugins.dashboard.fsSystemInfo() || !this.isFull(), this);
        self.fsTempGauges = ko.computed(() => this.isFull() && this.settingsViewModel.settings.plugins.dashboard.fsTempGauges() || !this.isFull(), this);
        self.fsFan = ko.computed(() => this.isFull() && this.settingsViewModel.settings.plugins.dashboard.fsFan() || !this.isFull(), this);
        self.fsCommandWidgets = ko.computed(() => this.isFull() && this.settingsViewModel.settings.plugins.dashboard.fsCommandWidgets() || !this.isFull(), this);
        self.fsJobControlButtons = ko.computed(() => this.isFull() && this.settingsViewModel.settings.plugins.dashboard.fsJobControlButtons() || !this.isFull(), this);
        self.fsSensorInfo = ko.computed(() => this.isFull() && this.settingsViewModel.settings.plugins.dashboard.fsSensorInfo() || !this.isFull(), this);
        self.fsPrinterMessage = ko.computed(() => this.isFull() && this.settingsViewModel.settings.plugins.dashboard.fsPrinterMessage() || !this.isFull(), this);
        self.fsProgressGauges = ko.computed(() => this.isFull() && this.settingsViewModel.settings.plugins.dashboard.fsProgressGauges() || !this.isFull(), this);
        self.fsLayerGraph = ko.computed(() => this.isFull() && this.settingsViewModel.settings.plugins.dashboard.fsLayerGraph() || !this.isFull(), this);
        self.fsFilament = ko.computed(() => this.isFull() && this.settingsViewModel.settings.plugins.dashboard.fsFilament() || !this.isFull(), this);
        self.fsFeedrate = ko.computed(() => this.isFull() && this.settingsViewModel.settings.plugins.dashboard.fsFeedrate() || !this.isFull(), this);
        self.fsWebCam = ko.computed(() => this.isFull() && this.settingsViewModel.settings.plugins.dashboard.fsWebCam() || !this.isFull(), this);

        //Scale down the file name if it is too long to fit one line #This should probably be placed somewhere else
        self.fitties = fitty('#fileInfo', { minSize: 2, maxSize: 20 });

        //Fullscreen
        self.urlParams = new URLSearchParams(window.location.search);
        var dashboardIsFull = self.urlParams.has('dashboard') && (self.urlParams.get('dashboard') == 'full');

        self.bindingDone = false;

        self.layerGraph;

        self.currentTab = '';

        //Themeify coloring
        var style = $('<style id="dashboard_themeify_style_tag"></style>');
        $('html > head').append(style);
        self.RefreshThemeifyColors = function() {
            var cond;
            var theme;
            try {
                theme = self.settingsViewModel.settings.plugins.themeify.theme();
                if (self.settingsViewModel.settings.plugins.themeify.enabled() == false) {
                    theme = '';
                }
            } catch { }


            cond = self.settingsViewModel.settings.plugins.dashboard.showTempGaugeColors() == false;

            switch (theme) {
                case 'discorded':
                    self.ThemeifyColor = '#7289da';
                    break;
                case 'material_ui_light':
                    self.ThemeifyColor = '#2196f3';
                    break;
                case 'cyborg':
                    self.ThemeifyColor = '#33b5e5';
                    break;
                case 'discoranged':
                    self.ThemeifyColor = '#fc8003';
                    break;
                case 'dyl':
                    self.ThemeifyColor = '#ff9800';
                    break;
                case 'nighttime':
                    self.ThemeifyColor = '#0073ff';
                    break;
                default:
                    self.ThemeifyColor = '#08c';
                    break;
            }

            if (self.settingsViewModel.settings.plugins.dashboard.useThemeifyColor() == false) {
                self.ThemeifyColor = '#08c';
            }

            setTimeout(() => {
                $('#dashboard_themeify_style_tag').html('.ct-series-a .ct-line { stroke: ' + self.ThemeifyColor + '!important; } .ct-chart span { color: ' + self.ThemeifyColor + '!important; } svg text { stroke: ' + self.ThemeifyColor + '!important; fill: ' + self.ThemeifyColor + '!important; }');
                $('.dashboardSmall, .dashboardLarge').css('color', self.ThemeifyColor);
                $('.dashboardGauge, .dashboardGridItem.speed svg path#t2').css('stroke', self.ThemeifyColor);
                $('.dashboardTempTick').css('stroke', $('body').css("color"));
                $('.dashboardGridItem.speed svg path#t1, .dashboardGridItem.speed svg circle').css('fill', self.ThemeifyColor);
                if (cond) {
                    $('.tempCurrent').css('stroke', self.ThemeifyColor);
                } else {
                    $('.tempCurrent').css('stroke', '');
                }
            }, 100);
        }

        //Notify user if displaylayerprogress plugin is not installed
        self.DisplayLayerProgressAvailable = function() {
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

        self.getToggleFullBrowserWindowHref = function() {
            var urlParams = new URLSearchParams(self.urlParams);
            if (!dashboardIsFull) {
                urlParams.set('dashboard', 'full');
            } else {
                urlParams.delete('dashboard');
            }
            return "?" + urlParams.toString() + "#tab_plugin_dashboard";
        }


        self.toggleFullBrowserWindow = function() {
            if (!dashboardIsFull) {
                //location.href="/#tab_plugin_dashboard/?dashboard=full";
                history.replaceState(null, null, ' ');
                self.urlParams.set('dashboard', 'full');
                window.location.hash = 'tab_plugin_dashboard';
                window.location.search = self.urlParams;
            } else {
                self.urlParams.delete('dashboard');
                window.location.search = self.urlParams;
                //self.urlParams.delete('dashboard');
            }
        }


        // Fullscreen
        self.fullScreen = function() {
            var elem = document.body;
            if (elem.requestFullscreen) {
                if (!document.fullscreenElement) {
                    elem.requestFullscreen();
                    self.isFull(true);
                    $('#dashboardContainer').addClass('dashboard-full');
                    $('body').css('overflow', 'hidden');
                    if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                        document.getElementById('dashboardContainer').style.setProperty('color', 'inherit', 'important');
                        $('#dashboardContainer').css('background-color', 'inherit');
                        $('#dashboardContainer').parents(':not(html):not(body)').css('background-color', 'inherit');
                    }
                } else if (document.exitFullscreen) {
                    document.exitFullscreen();
                    self.isFull(false);
                    if (!dashboardIsFull) {
                        $('#dashboardContainer').removeClass('dashboard-full');
                        $('body').css('overflow', '');
                        if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                            $('#dashboardContainer').css('background-color', '');
                            $('#dashboardContainer').parents(':not(html):not(body)').css('background-color', '');
                            $('#dashboardContainer').css('color', '');
                        }
                    }
                }
            }
            return
        }

        if (!dashboardIsFull) {
            document.onfullscreenchange = function(event) {
                if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                    var elem = document.body;
                    if (elem.requestFullscreen) {
                        if (!document.fullscreenElement) {
                            self.isFull(false);
                            $('#dashboardContainer').css('background-color', '');
                            $('#dashboardContainer').parents(':not(html):not(body)').css('background-color', '');
                            $('#dashboardContainer').css('color', '');
                            $('#dashboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
                        } else {
                            self.isFull(true);
                            document.getElementById('dashboardContainer').style.setProperty('color', 'inherit', 'important');
                            $('#dashboardContainer').css('background-color', 'inherit');
                            $('#dashboardContainer').parents(':not(html):not(body)').css('background-color', 'inherit');
                        }
                    }
                } else {
                    var elem = document.body;
                    if (elem.requestFullscreen) {
                        if (!document.fullscreenElement) {
                            self.isFull(false);
                            $('#dashboardContainer').removeClass('dashboard-full');
                            $('body').css('overflow', '');
                        } else {
                            self.isFull(true);
                        }
                    }
                }
            };
        }

        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin == "dashboard") {
                if (data.totalLayer) { self.totalLayer(data.totalLayer); }
                if (data.currentLayer) {
                    self.currentLayer(data.currentLayer);
                    if (self.totalLayer() > 0) {
                        self.heightProgressString(self.currentLayer() / self.totalLayer() * 100);
                        self.heightProgressBarString(Math.round(self.heightProgressString()) + '%');
                    }
                }
                if (data.currentHeight) { self.currentHeight(data.currentHeight); }
                if (data.totalHeight) { self.totalHeight(data.totalHeight); }
                if (data.feedrate && self.settingsViewModel.settings.plugins.dashboard.showFeedrate()) {
                    if (data.feedrate > self.settingsViewModel.settings.plugins.dashboard.feedrateMax()) {
                        data.feedrate = self.settingsViewModel.settings.plugins.dashboard.feedrateMax();
                    }
                    self.feedrate(data.feedrate);
                    self.feedrateAv((self.feedrateAv() * self.feedrateAvNo() + data.feedrate) / (self.feedrateAvNo() + 1));
                    self.feedrateAvNo(self.feedrateAvNo() + 1);
                    self.feedrateAvLastFiveSeconds((self.feedrateAvLastFiveSeconds() * self.feedrateAvNoLastFiveSeconds() + data.feedrate) / (self.feedrateAvNoLastFiveSeconds() + 1));
                    self.feedrateAvNoLastFiveSeconds(self.feedrateAvNoLastFiveSeconds() + 1);
                    setTimeout(() => {
                        self.feedrateAvLastFiveSeconds((self.feedrateAvLastFiveSeconds() * self.feedrateAvNoLastFiveSeconds() - data.feedrate) / (self.feedrateAvNoLastFiveSeconds() - 1));
                        self.feedrateAvNoLastFiveSeconds(self.feedrateAvNoLastFiveSeconds() - 1);
                    }, 5000);
                }
                if (data.feedrateG0) { self.feedrateG0(data.feedrateG0); }
                if (data.feedrateG1) { self.feedrateG1(data.feedrateG1); }
                if (data.fanspeed) { self.fanspeed(data.fanspeed); }
                if (data.lastLayerDuration) { self.lastLayerDuration(data.lastLayerDuration); }
                if (data.lastLayerDurationInSeconds) { self.lastLayerDurationInSeconds(data.lastLayerDurationInSeconds); }
                if (data.averageLayerDuration) { self.averageLayerDuration(data.averageLayerDuration); }
                if (data.averageLayerDurationInSeconds) { self.averageLayerDurationInSeconds(data.averageLayerDurationInSeconds); }
                if (data.changeFilamentTimeLeft) { self.changeFilamentTimeLeft(data.changeFilamentTimeLeft == "0s" ? "-" : data.changeFilamentTimeLeft); }
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
                if (data.cmdResults) {
                    resultUpdates = JSON.parse(data.cmdResults);
                    results = self.cmdResults();
                    results[resultUpdates["index"]] = resultUpdates["result"];
                    self.cmdResults(results);
                }
                if (data.cmdTest) {
                    testResult = JSON.parse(data.cmdTest);


                    printerDisplay = new PNotify({
                        title: 'Dashboard',
                        type: 'info',
                        text: `Command Widget Test Result: ${testResult["result"]}`,
                        hide: false
                    });
                }

            } else return;
        };


        self.printStarted = function() {
            //TODO: Clear vars from previous print to reset UI.
            self.feedrate(0);
            self.feedrateAv(0);
            self.feedrateAvNo(0);
            self.feedrateAvLastFiveSeconds(0);
            self.feedrateAvNoLastFiveSeconds(0);
            return;
        };

        self.cpuTempColor = function() {
            if (self.cpuTemp() >= self.settingsViewModel.settings.plugins.dashboard.cpuTempCriticalThreshold()) {
                return "red";
            } else if (self.cpuTemp() >= self.settingsViewModel.settings.plugins.dashboard.cpuTempWarningThreshold()) {
                return "orange";
            } else if (self.cpuTemp() < self.settingsViewModel.settings.plugins.dashboard.cpuTempWarningThreshold()) {
                return self.ThemeifyColor;
            }
        }

        self.tempColor = function(actual, target) {
            if (self.settingsViewModel.settings.plugins.dashboard.showTempGaugeColors() == true) {
                if (target == 0) {
                    return "#08c";
                } else if (parseInt(target) > 0) {
                    if (parseInt(actual) < parseInt(target) - parseInt(self.settingsViewModel.settings.plugins.dashboard.targetTempDeviation())) {
                        //console.log("Less than set temp!");
                        return "#08c"; //blue
                    } else if (parseInt(actual) > parseInt(target) + parseInt(self.settingsViewModel.settings.plugins.dashboard.targetTempDeviation())) {
                        //console.log("Above set temp!");
                        return "#ff3300"; //red
                    } else return "#28b623"; //green

                }
            } else return self.ThemeifyColor;
        }

        self.switchToDefaultWebcam = function() {
            self._switchWebcam(self.settingsViewModel.settings.plugins.dashboard.defaultWebcam() + 1);
        };

        self.onBeforeBinding = function() {
            var dashboardSettings = self.settingsViewModel.settings.plugins.dashboard;
            self.commandWidgetArray(dashboardSettings.commandWidgetArray());
            // widgets settings
            // widget settings are generated using the following observable array
            // required attributes for each item are: title (the name of the widget), setting (the observable that will be the enabled status of the widget)
            // for more complex things, the setting attribute can also be a function which returns the enabled status as a bool. in this case the enable and disable functions must also exist, and will be called when the widget is enabled and disabled. see the Progress Gauges setting for an example
            // additional widget settings can be added in two ways (ONLY ONE OF THESE WAYS CAN BE USED AT A TIME!).
            // --- Way to add widget settings 1 ---
            // use the settings attribute as an array of settings
            // settings can be of type radio or checkbox
            // see the Progress Gauges setitngs for an example
            // can also be of type title (will just show the title) - see Filament Widget for example
            // --- Way to add widget settings 2 ---
            // create a modal in the settings page jinja template and set the settingsId attribute below to the id of the modal with a # before it
            self.widgetsSettings = ko.observableArray([
                { title: "FullScreen & FullBrowser Mode Buttons", setting: dashboardSettings.showFullscreen },
                { title: "System Info", setting: dashboardSettings.showSystemInfo, settingsId: "#dashboardSysInfoSettingsModal", enableInFull: dashboardSettings.fsSystemInfo },
                { title: "Job Control Buttons", setting: dashboardSettings.showJobControlButtons, enableInFull: dashboardSettings.fsJobControlButtons },
                { title: "Temperature Gauges", setting: dashboardSettings.enableTempGauges, settingsId: "#dashboardTempGaugeSettingsModal", enableInFull: dashboardSettings.fsTempGauges },
                { title: "Fan Gauge", setting: dashboardSettings.showFan, enableInFull: dashboardSettings.fsFan },
                { title: "Temp Sensor Info from Enclosure Plugin", setting: dashboardSettings.showSensorInfo, enableInFull: dashboardSettings.fsSensorInfo },
                { title: "Command Widgets", setting: dashboardSettings.showCommandWidgets, settingsId: "#dashboardCommandSettingsModal", enableInFull: dashboardSettings.fsCommandWidgets },
                { title: "Printer Message (M117)", setting: dashboardSettings.showPrinterMessage, enableInFull: dashboardSettings.fsPrinterMessage },
                {
                    title: "Progress Gauges",
                    setting: function() {
                        return dashboardSettings.showTimeProgress() || dashboardSettings.showProgress() || dashboardSettings.showLayerProgress() || dashboardSettings.showHeightProgress();
                    },
                    enable: function() {
                        dashboardSettings.showTimeProgress(true);
                        dashboardSettings.showProgress(true);
                        dashboardSettings.showLayerProgress(true);
                        dashboardSettings.showHeightProgress(true);
                    },
                    disable: function() {
                        dashboardSettings.showTimeProgress(false);
                        dashboardSettings.showProgress(false);
                        dashboardSettings.showLayerProgress(false);
                        dashboardSettings.showHeightProgress(false);
                    },
                    settings: [
                        { type: "radio", title: "Progress gauge type", setting: dashboardSettings.gaugetype, options: [{ name: "Circle", value: "circle" }, { name: "Bar", value: "bar" }] },
                        { type: "checkbox", title: "Show Time Progress Gauge", setting: dashboardSettings.showTimeProgress },
                        { type: "checkbox", title: "Show GCode Progress Gauge", setting: dashboardSettings.showProgress },
                        { type: "checkbox", title: "Show Layer Progress Gauge", setting: dashboardSettings.showLayerProgress },
                        { type: "checkbox", title: "Show Height Progress Gauge", setting: dashboardSettings.showHeightProgress }
                    ],
                    enableInFull: dashboardSettings.fsProgressGauges
                },
                {
                    title: "Layer Duration Graph",
                    setting: dashboardSettings.showLayerGraph,
                    settings: [
                        { type: "radio", title: "Layer graph type", setting: dashboardSettings.layerGraphType, options: [{ name: "Normal", value: "normal" }, { name: "Last 40 Layers", value: "last40layers" }, { name: "Scrolling", value: "scrolling" }] }
                    ],
                    enableInFull: dashboardSettings.fsLayerGraph
                },
                { title: "Filament Widget", setting: dashboardSettings.showFilament, settings: [{ type: "title", title: "The filament widget shows how much filament has been extruded. It can also show the time untill next filament change." }, { type: "checkbox", title: "Show time untill next filament change", setting: dashboardSettings.showFilamentChangeTime },], enableInFull: dashboardSettings.fsFilament },
                { title: "Feedrate", setting: dashboardSettings.showFeedrate, settingsId: "#dashboardFeedrateSettingsModal", enableInFull: dashboardSettings.fsFeedrate },
                { title: "Webcam", setting: dashboardSettings.showWebCam, settingsId: "#dashboardWebcamSettingsModal", enableInFull: dashboardSettings.fsWebCam },
            ]);
        };

        self.enableWidget = function(widget) {
            if (widget.enable != null)
                widget.enable();
            else {
                widget.setting(true)
            };
        };

        self.disableWidget = function(widget) {
            if (widget.disable != null)
                widget.disable();
            else {
                widget.setting(false)
            };
        };

        self.onAfterBinding = function() {
            self.bindingDone = true;
        };

        self.doTempGaugeTicks = function () {
            var tempTicks = [];
            var temperatureTicks = self.settingsViewModel.settings.plugins.dashboard.temperatureTicks();
            if (temperatureTicks == 1) {
                temperatureTicks = 0;
            }

            for (i=0; i<temperatureTicks; i++)
            {
                tempTicks.push(i/(temperatureTicks-1));
            }

            self.tempGaugeTicks(tempTicks);
        }

        self.onSettingsHidden = function() {
            if (self.webcam_perm) {
                self.switchToDefaultWebcam();
            }
            self.commandWidgetArray(self.settingsViewModel.settings.plugins.dashboard.commandWidgetArray());
            self.doTempGaugeTicks();
            setTimeout(() => {
                self.RefreshThemeifyColors();
            }, 100);
        };

        self.toggleWebcam = function() {
            if (self.webcamState() == 0) {
                self.switchToDefaultWebcam();
            } else {
                self.webcamState(0);
            }
        };

        const webcamLoadingIcon = "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8' standalone='no'%3F%3E%3Csvg xmlns:svg='http://www.w3.org/2000/svg' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.0' width='128px' height='128px' viewBox='-256 -256 640 640' xml:space='preserve'%3E%3Cg%3E%3Ccircle cx='16' cy='64' r='16' fill='%23000000' fill-opacity='1'/%3E%3Ccircle cx='16' cy='64' r='14.344' fill='%23000000' fill-opacity='1' transform='rotate(45 64 64)'/%3E%3Ccircle cx='16' cy='64' r='12.531' fill='%23000000' fill-opacity='1' transform='rotate(90 64 64)'/%3E%3Ccircle cx='16' cy='64' r='10.75' fill='%23000000' fill-opacity='1' transform='rotate(135 64 64)'/%3E%3Ccircle cx='16' cy='64' r='10.063' fill='%23000000' fill-opacity='1' transform='rotate(180 64 64)'/%3E%3Ccircle cx='16' cy='64' r='8.063' fill='%23000000' fill-opacity='1' transform='rotate(225 64 64)'/%3E%3Ccircle cx='16' cy='64' r='6.438' fill='%23000000' fill-opacity='1' transform='rotate(270 64 64)'/%3E%3Ccircle cx='16' cy='64' r='5.375' fill='%23000000' fill-opacity='1' transform='rotate(315 64 64)'/%3E%3CanimateTransform attributeName='transform' type='rotate' values='0 64 64;315 64 64;270 64 64;225 64 64;180 64 64;135 64 64;90 64 64;45 64 64' calcMode='discrete' dur='720ms' repeatCount='indefinite'%3E%3C/animateTransform%3E%3C/g%3E%3C/svg%3E";
        const webcamLoadingIconLight = "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8' standalone='no'%3F%3E%3Csvg xmlns:svg='http://www.w3.org/2000/svg' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.0' width='128px' height='128px' viewBox='-256 -256 640 640' xml:space='preserve'%3E%3Cg%3E%3Ccircle cx='16' cy='64' r='16' fill='%23ffffff' fill-opacity='1'/%3E%3Ccircle cx='16' cy='64' r='14.344' fill='%23ffffff' fill-opacity='1' transform='rotate(45 64 64)'/%3E%3Ccircle cx='16' cy='64' r='12.531' fill='%23ffffff' fill-opacity='1' transform='rotate(90 64 64)'/%3E%3Ccircle cx='16' cy='64' r='10.75' fill='%23ffffff' fill-opacity='1' transform='rotate(135 64 64)'/%3E%3Ccircle cx='16' cy='64' r='10.063' fill='%23ffffff' fill-opacity='1' transform='rotate(180 64 64)'/%3E%3Ccircle cx='16' cy='64' r='8.063' fill='%23ffffff' fill-opacity='1' transform='rotate(225 64 64)'/%3E%3Ccircle cx='16' cy='64' r='6.438' fill='%23ffffff' fill-opacity='1' transform='rotate(270 64 64)'/%3E%3Ccircle cx='16' cy='64' r='5.375' fill='%23ffffff' fill-opacity='1' transform='rotate(315 64 64)'/%3E%3CanimateTransform attributeName='transform' type='rotate' values='0 64 64;315 64 64;270 64 64;225 64 64;180 64 64;135 64 64;90 64 64;45 64 64' calcMode='discrete' dur='720ms' repeatCount='indefinite'%3E%3C/animateTransform%3E%3C/g%3E%3C/svg%3E";
        self._switchWebcam = function(cameraNum) {
            if (self.bindingDone && self.webcam_perm()) {
                if (cameraNum != self.webcamState()) {
                    document.getElementById('dashboard_webcam_image').setAttribute('src', (document.fullscreenElement || dashboardIsFull) && !self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors() ? webcamLoadingIconLight : webcamLoadingIcon);
                }
                setTimeout(() => {
                    if (self.settingsViewModel.settings.plugins.dashboard.enableDashMultiCam()) {
                        var webcamIndex = cameraNum - 1;
                        var webcam = self.settingsViewModel.settings.plugins.dashboard._webcamArray()[webcamIndex];
                        self.rotate(webcam.rotate());
                        self.flipH(webcam.flipH());
                        self.flipV(webcam.flipV());
                    } else {
                        self.rotate(self.settingsViewModel.settings.webcam.rotate90());
                        self.flipH(self.settingsViewModel.settings.webcam.flipH());
                        self.flipV(self.settingsViewModel.settings.webcam.flipV());
                    }

                    self.webcamState(cameraNum);
                }, 100);
            }
        };

        self.switchWebcam = function() {
            self._switchWebcam(this);
        };

        self.dashboardFullClass = function() {
            var css = { dashboardOverlayFull: self.settingsViewModel.settings.plugins.dashboard.dashboardOverlayFull() };
            css['dashboard_full_ratio169_rotated'] = false;
            css['dashboard_full_ratio43_rotated'] = false;
            css['dashboard_full_ratio169_unrotated'] = false;
            css['dashboard_full_ratio43_unrotated'] = false;
            css['dashboard_full_' + self.webcamRatioClass() + (self.rotate() ? '_rotated' : '_unrotated')] = true;
            return css;
        };

        self.webcamRatioClass = function() {
            if (self.settingsViewModel.settings.plugins.dashboard.enableDashMultiCam()) {
                var webcamIndex = self.webcamState() - 1;
                var webcam = self.settingsViewModel.settings.plugins.dashboard._webcamArray()[webcamIndex];
                if (webcam == null) {
                    return 'ratio169';
                }
                return webcam.streamRatio() == '16:9' ? 'ratio169' : 'ratio43';
            } else {
                return self.settingsViewModel.settings.webcam.streamRatio() == '16:9' ? 'ratio169' : 'ratio43';
            }
        };

        self.embedUrl = function() {
            if (self.webcamState() > 0 && self.settingsViewModel.settings.webcam && self.settingsViewModel.settings.plugins.dashboard.showWebCam() == true && self.isTabVisible()) {
                if (self.settingsViewModel.settings.plugins.dashboard.enableDashMultiCam()) {
                    var webcamIndex = self.webcamState() - 1;
                    var webcam = self.settingsViewModel.settings.plugins.dashboard._webcamArray()[webcamIndex];
                    var nonce = webcam.disableNonce() ? '' : '?nonce_dashboard=' + new Date().getTime();
                    return webcam.url() + nonce;
                } else {
                    var nonce = self.settingsViewModel.settings.plugins.dashboard.disableWebcamNonce() ? '' : '?nonce_dashboard=' + new Date().getTime();
                    return self.settingsViewModel.settings.webcam.streamUrl() + nonce;
                }
            } else if (self.webcamState() == 0 || self.settingsViewModel.settings.plugins.dashboard.showWebCam() == false) {
                $("#dashboard_webcam_image").attr("src", "");
                return "";
            } else return;
        };

        var formatTime = (date) => {
            var str = "";
            var ampm = "";
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var seconds = date.getSeconds();
            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            if (self.settingsViewModel.settings.plugins.dashboard.ETAUse12HTime()) {
                ampm = hours >= 12 ? ' pm' : ' am';
                hours = hours % 12;
                hours = hours ? hours : 12;
            }
            if (self.settingsViewModel.settings.plugins.dashboard.ETAShowSeconds()) {
                str = hours + ':' + minutes + ':' + seconds + ampm;
            } else {
                str = hours + ':' + minutes + ampm;
            }
            return str;
        }

        self.getEta = function(seconds) {
            dt = new Date();
            dt.setSeconds(dt.getSeconds() + seconds);
            //return dt.toTimeString().split(' ')[0];
            return formatTime(dt);
        };

        self.roundToTwo = function(num) {
            return (Math.round(num * 100) / 100);
        }

        self.tempGaugeSvgPath = ko.computed(() => {
            a = Math.PI/180*(360-self.tempGaugeAngle())/2;
            offset = self.tempGaugeOffset();
            radius = self.tempGaugeRadius();
            leftX = self.roundToTwo(radius - radius*Math.sin(a) + offset);
            leftY = self.roundToTwo(offset + radius + radius*Math.cos(a));
            rightX = self.roundToTwo(2*radius*Math.sin(a));
            rightY = 0;

            return `M${leftX} ${leftY}a${radius} ${radius} 0 1 1 ${rightX} ${rightY}`;
        });


        self.tempGaugePathLen = ko.computed(() => {
            return self.roundToTwo(self.tempGaugeRadius()*Math.PI*self.tempGaugeAngle()/180);
        });

        self.tempGaugeViewBox = ko.computed(() => {
            return `0 0 ${2*(self.tempGaugeRadius()+self.tempGaugeOffset())} ${2*(self.tempGaugeRadius()+self.tempGaugeOffset())}`;
        });

        self.tempGaugeTickPath = (tick) => {
            a = Math.PI/180*(0.5*(360-self.tempGaugeAngle()) + self.tempGaugeAngle()*tick);
            offset = self.tempGaugeOffset();
            radius = self.tempGaugeRadius();
            inset = 10;
            outset = 20;

            innerX = self.roundToTwo(radius - (radius-inset)*Math.sin(a) + offset);
            innerY = self.roundToTwo(offset + radius + (radius-inset)*Math.cos(a));
            outerX = self.roundToTwo(-(inset+outset)*Math.sin(a));
            outerY = self.roundToTwo((inset+outset)*Math.cos(a));

            return `M${innerX} ${innerY}l${outerX} ${outerY}`;
        };

        self.tempGaugeTickTextX = (tick) => {
            a = Math.PI/180*(0.5*(360-self.tempGaugeAngle()) + self.tempGaugeAngle()*tick);
            offset = self.tempGaugeOffset();
            radius = self.tempGaugeRadius();
            textOutset = 35;

            textX = self.roundToTwo(radius - (radius+textOutset)*Math.sin(a) + offset);

            return textX;
        };

        self.tempGaugeTickTextY = (tick) => {
            a = Math.PI/180*(0.5*(360-self.tempGaugeAngle()) + self.tempGaugeAngle()*tick);
            offset = self.tempGaugeOffset();
            radius = self.tempGaugeRadius();
            textOutset = 35;

            textY = self.roundToTwo(offset + radius + (radius+textOutset)*Math.cos(a));

            return textY;
        };



        self.formatFanOffset = function(fanSpeed) {
            fanSpeed = fanSpeed.replace("%", "");
            fanSpeed = fanSpeed.replace("-", 1);
            fanSpeed = fanSpeed.replace("Off", 1);
            if (fanSpeed) {
                return self.roundToTwo(self.tempGaugePathLen() * (1 - fanSpeed / 100));
            } else return 0;
        };

        self.formatProgressOffset = function(currentProgress) {
            if (currentProgress) {
                return 339.292 * (1 - (currentProgress / 100));
            } else return "0.0";
        };

        self.formatTempOffset = function(temp, range) {
            if (temp) {
                return self.roundToTwo(self.tempGaugePathLen() * (1 - temp / range));
            } else return self.tempGaugePathLen();
        };

        self.formatConnectionstatus = function(currentStatus) {
            if (currentStatus) {
                return "Connected";
            } else return "Disconnected";
        };

        self.testCommandWidget = function() {
            $.ajax({
                url: API_BASEURL + "plugin/dashboard",
                type: "POST",
                dataType: "json",
                data: JSON.stringify({
                    command: "testCmdWidget",
                    cmd: this
                }),
                contentType: "application/json; charset=UTF-8"
            });
        };

        self.addCommandWidget = function() {
            console.log("Adding command Widget");
            self.settingsViewModel.settings.plugins.dashboard.commandWidgetArray.push({ icon: ko.observable('command-icon.png'), name: ko.observable(''), command: ko.observable(''), enabled: ko.observable(false), interval: ko.observable(10) });
        };

        self.removeCommandWidget = function(command) {
            console.log("Removing Command Widget");
            self.settingsViewModel.settings.plugins.dashboard.commandWidgetArray.remove(command);
        };

        self.addWebCam = function() {
            console.log("Adding Webcam");
            self.settingsViewModel.settings.plugins.dashboard._webcamArray.push({ name: ko.observable('name'), url: ko.observable('http://'), flipV: ko.observable(false), flipH: ko.observable(false), rotate: ko.observable(false), disableNonce: ko.observable(false), streamRatio: ko.observable('16:9') });
            self.switchToDefaultWebcam();
        };

        self.removeWebCam = function(webCam) {
            console.log("Removing Webcam");
            self.settingsViewModel.settings.plugins.dashboard._webcamArray.remove(webCam);
            self.switchToDefaultWebcam();
        };


        if (self.gcodeViewModel) {
            var gcodeLayerCommands = 1;
            var oldGcodeViewModel_processData = self.gcodeViewModel._processData;
            self.gcodeViewModel._processData = function(data) {
                if (self.gcodeViewModel.loadedFilepath &&
                    self.gcodeViewModel.loadedFilepath === data.job.file.path &&
                    self.gcodeViewModel.loadedFileDate === data.job.file.date) {
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
            self.gcodeViewModel._onLayerSelected = function(layer) {
                if (layer) {
                    gcodeLayerCommands = layer.commands;
                }
                return oldGcodeViewModel_onLayerSelected.apply(oldGcodeViewModel_onLayerSelected, [layer]);
            }
        }

        // see the function inside onstartupcomplete
        self.layerProgress_onTabChange = function() {
            return;
        }

        self.onTabChange = function(current, previous) {
            self.layerProgress_onTabChange(current, previous);

            self.currentTab = current;

            if (current == "#tab_plugin_dashboard") {
                self.isTabVisible(true);
            } else if (previous == "#tab_plugin_dashboard") {
                self.isTabVisible(false);
            };
        };


        self.renderChart = function(layerTimes, layerLabels) {
            if (self.bindingDone)
            {
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

                if (self.settingsViewModel.settings.plugins.dashboard.layerGraphType() == "last40layers") {
                    for (var i = values.length - 40; i < values.length; i += 1) {
                        data.series[0].push(values[i])
                    }
                    for (var i = labels.length - 40; i < labels.length; i += 1) {
                        data.labels.push(labels[i])
                    }
                } else {
                    for (var i = 0; i < values.length; i += 1) {
                        data.series[0].push(values[i])
                    }
                    for (var i = 0; i < labels.length; i += 1) {
                        data.labels.push(labels[i])
                    }
                }

                let calculatedWidth = 98;

                if (self.settingsViewModel.settings.plugins.dashboard.layerGraphType() == "scrolling") {
                    calculatedWidth *= Math.max(labels.length / 40, 1)
                }

                //Chart Options
                var options = {
                    onlyInteger: true,
                    showPoint: false,
                    lineSmooth: true,
                    fullWidth: true,
                    width: `${calculatedWidth}%`,
                    height: '150px',
                    axisX: {
                        showGrid: false,
                        showLabel: true,
                        labelInterpolationFnc: function skipLabels(value, index, labels) {
                            let interval = (self.settingsViewModel.settings.plugins.dashboard.layerGraphType() == "normal")
                            ? Math.ceil(labels.length / 20)
                            : 5;

                            if (labels[index] % interval == 0 && labels.length - index >= interval) {
                                return value;
                            } else {
                                return null;
                            }
                        }
                    }
                };
                self.layerGraph.update(data, options);
            }
        };

        self.gaugesCentreInGrid = function(type, index = 0, css = {}) {
            var last = [{}];
            var num = 0;
            var setLast = function(type, index = 0) {
                num++;
                last[1] = last[0];
                last[0] = { type: type, index: index };
            }
            if (self.temperatureModel.isOperational()) {
                if (self.settingsViewModel.settings.plugins.dashboard.enableTempGauges()) {
                    self.temperatureModel.tools().forEach(function(val, index) {
                        if (!self.settingsViewModel.settings.plugins.dashboard.hideHotend() || (self.settingsViewModel.settings.plugins.dashboard.hideHotend() && val.target() > 0))
                            setLast('tool', index);
                    });
                    if (self.temperatureModel.hasBed())
                        setLast('bed');
                    if (self.temperatureModel.hasChamber())
                        setLast('chamber');
                }
                if (self.settingsViewModel.settings.plugins.dashboard.showFan())
                    setLast('fan');
                while (num > 3) {
                    num -= 3;
                }
                css.centreInGrid2 = false;
                css.centreInGrid1 = false;
                if (num == 2 && ((type == last[0].type && index == last[0].index) || (type == last[1].type && index == last[1].index)))
                    css.centreInGrid2 = true;
                if (num == 1 && type == last[0].type && index == last[0].index)
                    css.centreInGrid1 = true;
            }
            return css;
        }

        // full page
        if (dashboardIsFull) {
            var dashboardFullLoaderHtml = '<div class="dashboardFullLoader">Please Wait...</div>';
            $('body').append(dashboardFullLoaderHtml);
        }

        // startup complete
        self.onStartupComplete = function() {
            try {
                self.admin(self.loginState.userneeds().role.includes('plugin_dashboard_admin'));
            }
            catch {
                self.admin(true);
            }

            try {
                self.webcam_perm(self.loginState.userneeds().role.includes('webcam'));
            }
            catch {
                self.webcam_perm(true);
            }
            setTimeout(() => {
                self.RefreshThemeifyColors();
            }, 100);
            setTimeout(() => {
                self.RefreshThemeifyColors();
            }, 1500);
            try {
                self.settingsViewModel.settings.plugins.themeify.theme.subscribe(function(newValue) {
                    setTimeout(() => {
                        self.RefreshThemeifyColors();
                    }, 100);
                });
                self.settingsViewModel.settings.plugins.themeify.enabled.subscribe(function(newValue) {
                    setTimeout(() => {
                        self.RefreshThemeifyColors();
                    }, 100);
                });
            } catch { }
            self.settingsViewModel.settings.plugins.dashboard.showTempGaugeColors.subscribe(function(newValue) {
                setTimeout(() => {
                    self.RefreshThemeifyColors();
                }, 100);
            });

            self.settingsViewModel.settings.plugins.dashboard.useThemeifyColor.subscribe(function(newValue) {
                setTimeout(() => {
                    self.RefreshThemeifyColors();
                }, 100);
            });

            self.settingsViewModel.settings.webcam.rotate90.subscribe(function(newValue) {
                self.rotate(newValue);
            });
            self.settingsViewModel.settings.webcam.flipH.subscribe(function(newValue) {
                self.flipH(newValue);
            });
            self.settingsViewModel.settings.webcam.flipV.subscribe(function(newValue) {
                self.flipV(newValue);
            });

            self.printerStateModel.printTime.subscribe(function(newValue) {
                if (newValue == null || self.printerStateModel.printTimeLeft() == null || self.printerStateModel.printTimeLeft() == 0) {
                    self.timeProgressString(0.01);
                    self.timeProgressBarString("0%");
                } else {
                    self.timeProgressString((newValue / (newValue + self.printerStateModel.printTimeLeft())) * 100);
                    self.timeProgressBarString(Math.round((newValue / (newValue + self.printerStateModel.printTimeLeft())) * 100) + "%");
                }
            });
            // full page
            if (dashboardIsFull) {
                self.isFull(true);
                $('#dashboardContainer').addClass('dashboard-full');
                $('body').css('overflow', 'hidden');
                $('.dashboardFullLoader').css('display', 'none');
                if (self.settingsViewModel.settings.plugins.dashboard.fullscreenUseThemeColors()) {
                    document.getElementById('dashboardContainer').style.setProperty('color', 'inherit', 'important');
                    $('#dashboardContainer').css('background-color', 'inherit');
                    $('#dashboardContainer').parents(':not(html):not(body)').css('background-color', 'inherit');
                }
            }

            if (self.gcodeViewModel) {
                if (self.settingsViewModel.settings.plugins.dashboard.showLayerProgress()) {
                    self.gcodeViewModel.tabActive = true;
                    setTimeout(() => {
                        self.gcodeViewModel.tabActive = true;
                    }, 100);
                }

                self.layerProgress_onTabChange = function(current, previous) {
                    setTimeout(() => {
                        if (self.settingsViewModel.settings.plugins.dashboard.showLayerProgress()) {
                            self.gcodeViewModel.tabActive = true;
                        }
                    }, 50);
                };
            } else if (self.settingsViewModel.settings.plugins.dashboard.showLayerProgress()) {
                printerDisplay = new PNotify({
                    title: 'Dashboard',
                    type: 'warning',
                    text: 'Can\'t get stats from Gcode Visualizer. This (built-in) plugin provides the current layer progress. If you want this stat visible, please install and enable the Gcode Visualizer plugin. Otherwise, disable the Layer Progress gauge.',
                    hide: false
                });
            }

            self.settingsViewModel.settings.plugins.dashboard.showLayerProgress.subscribe(function(newValue) {
                setTimeout(() => {
                    if (newValue === true) {
                        if (self.gcodeViewModel) {
                            self.gcodeViewModel.tabActive = true;
                            if (self.gcodeViewModel.needsLoad) {
                                self.gcodeViewModel.loadFile(self.gcodeViewModel.selectedFile.path(), self.gcodeViewModel.selectedFile.date());
                            }

                        } else {
                            printerDisplay = new PNotify({
                                title: 'Dashboard',
                                type: 'warning',
                                text: 'Can\'t get stats from Gcode Visualizer. This (built-in) plugin provides the current layer progress. If you want this stat visible, please install and enable the Gcode Visualizer plugin. Otherwise, disable the Layer Progress gauge.',
                                hide: false
                            });
                        }
                    }
                }, 5);
            });

            self.printerStateModel.isPrinting.subscribe(function(newValue) {
                //wait for things to laod
                setTimeout(() => {
                    if (self.settingsViewModel.settings.plugins.dashboard.showLayerProgress()) {
                        if (self.gcodeViewModel) {
                            if (newValue === true) {
                                if (self.gcodeViewModel.needsLoad) {
                                    self.gcodeViewModel.loadFile(self.gcodeViewModel.selectedFile.path(), self.gcodeViewModel.selectedFile.date());
                                }
                            }
                        }
                    }
                }, 100);
            });

            if (self.webcam_perm)
            {
                self.switchToDefaultWebcam();
            }


            self.layerGraph = new Chartist.Line('.ct-chart');

            self.doTempGaugeTicks();

            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState == 'visible' && self.currentTab == '#tab_plugin_dashboard') {
                    self.isTabVisible(true);
                } else {
                    self.isTabVisible(false);
                }
            });
        }

        self.onServerDisconnect = function() {
            self.isTabVisible(false);
        }

        self.onDataUpdaterReconnect = function () {
            if (self.currentTab == '#tab_plugin_dashboard') {
                self.isTabVisible(true);
            } else {
                self.isTabVisible(false);
            }
        }
    };

    // view model class, parameters for constructor, container to bind to
    OCTOPRINT_VIEWMODELS.push({
        construct: DashboardViewModel,
        dependencies: ["temperatureViewModel", "printerStateViewModel", "printerProfilesViewModel", "connectionViewModel", "settingsViewModel", "displaylayerprogressViewModel", "controlViewModel", "gcodeViewModel", "enclosureViewModel", "loginStateViewModel"],
        optional: ["displaylayerprogressViewModel", "enclosureViewModel", "gcodeViewModel"],
        elements: ["#tab_plugin_dashboard", "#settings_plugin_dashboard"]
    });

});
