/*
 * View model for OctoPrint-Dashboard
 *
 * Authors: Stefan Cohen, j7126, Willmac16, CynanX
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
        self.controlViewModel = parameters[5];
        self.enclosureViewModel = parameters[6];
        self.loginState = parameters[7];

        //Settings
        self.dashboardSettings = null;

        // Array of DashboardWidget Objects
        self.widgets = ko.observableArray([]);
        // dict of DataUpdaterPluginMessage message handling functions
        self.DUPM_handler = {};

        //Dashboard layer progress vars
        self.layerProgress = ko.observable("-");
        self.totalLayer = ko.observable("-");
        self.currentLayer = ko.observable("-");
        self.currentHeight = ko.observable("-");
        self.currentMove = ko.observable("-");
        self.totalMoves = ko.observable("-");
        self.nextChange = ko.observable("-");
        self.totalHeight = ko.observable("-");
        self.fanspeed = ko.observable("Off");
        self.lastLayerDuration = ko.observable("-");
        self.lastLayerDurationInSeconds = ko.observable("-");
        self.averageLayerDuration = ko.observable("-");
        self.averageLayerDurationInSeconds = ko.observable("-");
        self.changeFilamentCount = ko.observable("-");

        self.feedrate = ko.observable(0);
        self.feedrateAv = ko.observable(0);
        self.feedrateAvLastFiveSeconds = ko.observable(0);
        self.feedrateAvNoLastFiveSeconds = ko.observable(0);

        //Dashboard backend vars
        self.getEta = ko.observable();
        self.extrudedFilament = ko.observable(0.00);
        self.timeProgressString = ko.observable(0.01);
        self.timeProgressBarString = ko.observable("0%");
        self.heightProgressString = ko.observable(0.01);
        self.heightProgressBarString = ko.observable("0%");
        self.printerMessage = ko.observable("");
        self.cpuPercent = ko.observable(0);
        self.cpuFreq = ko.observable(0);
        self.virtualMemPercent = ko.observable(0);
        self.diskUsagePercent = ko.observable(0);
        self.cpuTemp = ko.observable(0);
        self.commandWidgetArray = ko.observableArray();
        self.cmdResults = ko.observableArray();
        self.webcamState = ko.observable(0);
        self.rotate = ko.observable(0);
        self.flipH = ko.observable(0);
        self.flipV = ko.observable(0);
        self.isFull = ko.observable(false);

        self.webcamHlsEnabled = ko.observable(false);
        self.webcamMjpgEnabled = ko.observable(true);

        self.accentColor = ko.observable("#08c");
        self.textColor = ko.observable("#000");

        // 3/4 Gauge Rendering vars
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

        self.hls;

        //Scale down the file name if it is too long to fit one line #This should probably be placed somewhere else
        self.fitties = fitty('#fileInfo', { minSize: 2, maxSize: 20 });

        //Fullscreen
        self.urlParams = new URLSearchParams(window.location.search);
        var dashboardIsFull = self.urlParams.has('dashboard') && (self.urlParams.get('dashboard') == 'full');

        self.bindingDone = false;

        self.layerGraph;

        self.currentTab = '';

        self.chartWidth = 98;

        //Themeify coloring
        self.RefreshThemeColors = function () {
            var theme;
            try {
                theme = self.settingsViewModel.settings.plugins.themeify.theme();
                if (self.settingsViewModel.settings.plugins.themeify.enabled() == false) {
                    theme = '';
                }
            } catch { }

            switch (theme) {
                case 'discorded':
                    self.accentColor('#7289da');
                    break;
                case 'material_ui_light':
                    self.accentColor('#2196f3');
                    break;
                case 'cyborg':
                    self.accentColor('#33b5e5');
                    break;
                case 'discoranged':
                    self.accentColor('#fc8003');
                    break;
                case 'dyl':
                    self.accentColor('#ff9800');
                    break;
                case 'nighttime':
                    self.accentColor('#0073ff');
                    break;
                default:
                    self.accentColor('#08c');
                    break;
            }

            if ($(":root").css("--accent")) {
                self.accentColor($(":root").css("--accent"));
            }

            // if user doesn't want theming to change colors, then don't change them
            if (self.dashboardSettings.useThemeifyColor() == false) {
                self.accentColor('#08c');
            }

            self.textColor($('body').css("color"));
        }

        self.getToggleFullBrowserWindowHref = function() {
            var urlParams = new URLSearchParams(self.urlParams);
            if (!dashboardIsFull) {
                urlParams.set('dashboard', 'full');
            } else {
                urlParams.delete('dashboard');
            }
            return "?" + urlParams.toString() + "#tab_plugin_dashboard";
        }

        self.toggleFullBrowserWindow = function () {
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
        self.fullScreen = function () {
            var elem = document.body;
            if (elem.requestFullscreen) {
                if (!document.fullscreenElement) {
                    elem.requestFullscreen();
                    self.isFull(true);
                    $('#dashboardContainer').addClass('dashboard-full');
                    $('body').css('overflow', 'hidden');
                    if (self.dashboardSettings.fullscreenUseThemeColors()) {
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
                        if (self.dashboardSettings.fullscreenUseThemeColors()) {
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
            document.onfullscreenchange = function (event) {
                if (self.dashboardSettings.fullscreenUseThemeColors()) {
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

        self.onDataUpdaterPluginMessage = function (plugin, data) {
            if (plugin in self.DUPM_handler) {
                for (const key in data) {
                    if (key in self.DUPM_handler[plugin]) {
                        self.DUPM_handler[plugin][key](data[key]);
                    }
                }
            }
            if (plugin == "dashboard") {
                // console.log(JSON.stringify(data));

                // Layer
                if (data.totalLayers) { self.totalLayer(data.totalLayers); }
                if (data.currentLayer) { self.currentLayer(data.currentLayer); }
                if (data.layerProgress) { self.layerProgress(data.layerProgress); }

                // Height
                if (data.maxZ) { self.totalHeight(Number(data.maxZ).toFixed(1)); }
                if (data.currentHeight) {
                    self.currentHeight(data.currentHeight);

                    if (self.totalHeight() > 0) {
                        self.heightProgressString(self.currentHeight() / self.totalHeight() * 100);
                        self.heightProgressBarString(Math.round(self.heightProgressString()) + '%');
                    }
                }

                // Feedrate
                if (data.currentFeedrate && self.dashboardSettings.showFeedrate()) {
                    // direct
                    self.feedrate(data.currentFeedrate);
                    // max
                    if (data.currentFeedrate > self.dashboardSettings.feedrateMax()) {
                        data.currentFeedrate = self.dashboardSettings.feedrateMax();
                    }
                    self.feedrate(data.currentFeedrate);

                    if (data.avgFeedrate > self.dashboardSettings.feedrateMax()) {
                        self.feedrateAv(self.dashboardSettings.feedrateMax());
                    } else {
                        self.feedrateAv(data.avgFeedrate);
                    }

                    self.feedrateAvLastFiveSeconds((self.feedrateAvLastFiveSeconds() * self.feedrateAvNoLastFiveSeconds() + data.currentFeedrate) / (self.feedrateAvNoLastFiveSeconds() + 1));
                    setTimeout(() => {
                        self.feedrateAvLastFiveSeconds((self.feedrateAvLastFiveSeconds() * self.feedrateAvNoLastFiveSeconds() - data.currentFeedrate) / (self.feedrateAvNoLastFiveSeconds() - 1));
                    }, 5000);
                }

                // Fan Speed
                if (data.fanspeed) { self.fanspeed(data.fanspeed); }

                // Layer Duration Data
                if (data.lastLayerDuration) { self.lastLayerDuration(data.lastLayerDuration); }
                if (data.lastLayerDurationInSeconds) { self.lastLayerDurationInSeconds(data.lastLayerDurationInSeconds); }
                if (data.averageLayerDuration) { self.averageLayerDuration(data.averageLayerDuration); }
                if (data.averageLayerDurationInSeconds) { self.averageLayerDurationInSeconds(data.averageLayerDurationInSeconds); }

                // System Stats handling
                if (data.cpuPercent) { self.cpuPercent(data.cpuPercent); }
                if (data.cpuFreq) { self.cpuFreq(data.cpuFreq); }
                if (data.virtualMemPercent) { self.virtualMemPercent(data.virtualMemPercent); }
                if (data.diskUsagePercent) { self.diskUsagePercent(data.diskUsagePercent); }
                if (data.cpuTemp) { self.cpuTemp(data.cpuTemp); }

                // printer message handling
                if (data.printerMessage) { self.printerMessage(data.printerMessage); }

                // Filament handling
                if (data.totalMoves) { self.totalMoves(data.totalMoves); }
                if (data.extrudedFilament) { self.extrudedFilament(data.extrudedFilament); }
                if (data.nextChange) { self.nextChange(data.nextChange); }
                if (data.currentMove) { self.currentMove(data.currentMove); }


                // TODO: only send necessary layer labels
                if (data.layerTimes && data.layerLabels) { self.renderChart(data.layerTimes, data.layerLabels); }


                if (data.printStarted) { self.printStarted(); }
                if (data.printEnd) { self.printEnd(); }

                // Cmd Widget Handling
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

            }
        };


        self.printStarted = function () {
            if (self.dashboardSettings.clearOn_PrinterMessage() == 1)
                self.printerMessage('')
            if (self.dashboardSettings.clearOn_LayerGraph() == 1)
                self.renderChart('[]', '[]');
            if (self.dashboardSettings.clearOn_Filament() == 1) {
                self.extrudedFilament(0.00);
            }
            if (self.dashboardSettings.clearOn_Feedrate() == 1) {
                self.feedrate(0);
                self.feedrateAv(0);
                self.feedrateAvLastFiveSeconds(0);
                self.feedrateAvNoLastFiveSeconds(0);
            }
            return;
        };

        self.printEnd = function () {
            // TODO: Clear On for all widgets in self.widgets
            if (self.dashboardSettings.clearOn_PrinterMessage() == 2)
                self.printerMessage('')
            if (self.dashboardSettings.clearOn_LayerGraph() == 2)
                self.renderChart('[]', '[]');
            if (self.dashboardSettings.clearOn_Filament() == 2) {
                self.extrudedFilament(0.00);
            }
            if (self.dashboardSettings.clearOn_Feedrate() == 2) {
                self.feedrate(0);
                self.feedrateAv(0);
                self.feedrateAvLastFiveSeconds(0);
                self.feedrateAvNoLastFiveSeconds(0);
            }
            return;
        };

        self.cpuTempColor = function () {
            if (self.cpuTemp() >= self.dashboardSettings.cpuTempCriticalThreshold()) {
                return "red";
            } else if (self.cpuTemp() >= self.dashboardSettings.cpuTempWarningThreshold()) {
                return "orange";
            } else if (self.cpuTemp() < self.dashboardSettings.cpuTempWarningThreshold()) {
                return self.accentColor();
            }
        }

        self.tempColor = function (actual, target) {
            if (self.dashboardSettings.showTempGaugeColors() == true) {
                if (target == 0) {
                    return "#08c";
                } else if (parseInt(target) > 0) {
                    if (parseInt(actual) < parseInt(target) - parseInt(self.dashboardSettings.targetTempDeviation())) {
                        //console.log("Less than set temp!");
                        return "#08c"; //blue
                    } else if (parseInt(actual) > parseInt(target) + parseInt(self.dashboardSettings.targetTempDeviation())) {
                        //console.log("Above set temp!");
                        return "#ff3300"; //red
                    } else return "#28b623"; //green

                }
            } else return self.accentColor();
        }

        self.switchToDefaultWebcam = function () {
            self._switchWebcam(self.dashboardSettings.defaultWebcam() + 1);
        };

        // --- Widget ForEach prep ---
        self.widgetTypes = {
            THREE_QUARTER: '3/4',
            PROGRESS: 'progress',
            TIME: 'time',
            CURRENT_OF_TOTAL: 'currentOfTotal',
            TEXT: 'text',
            GRAPH: 'graph'
            // Add Feedrate Style gague
        };

        self.castToWidgetTypes = function (value) {
            let lower = String(value).toLowerCase();
            for (const source in self.widgetTypes) {
                if (lower === self.widgetTypes[source]) {
                    return self.widgetTypes[source];
                }
            }

            return "NONE";
        }

        self.onBeforeBinding = function () {
            self.dashboardSettings = self.settingsViewModel.settings.plugins.dashboard;
            var dashboardSettings = self.dashboardSettings;
            self.commandWidgetArray(self.dashboardSettings.commandWidgetArray());

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
                { title: "FullScreen & FullBrowser Mode Buttons", enabled: self.dashboardSettings.showFullscreen },
                { title: "System Info", enabled: self.dashboardSettings.showSystemInfo, settingsId: "#dashboardSysInfoSettingsModal", enableInFull: self.dashboardSettings.fsSystemInfo, printingOnly: self.dashboardSettings.printingOnly_SystemInfo },
                { title: "Job Control Buttons", enabled: self.dashboardSettings.showJobControlButtons, enableInFull: self.dashboardSettings.fsJobControlButtons, printingOnly: self.dashboardSettings.printingOnly_JobControlButtons },
                { title: "Temperature Gauges", enabled: self.dashboardSettings.enableTempGauges, settingsId: "#dashboardTempGaugeSettingsModal", enableInFull: self.dashboardSettings.fsTempGauges, printingOnly: self.dashboardSettings.printingOnly_TempGauges },
                { title: "Fan Gauge", enabled: self.dashboardSettings.showFan, enableInFull: self.dashboardSettings.fsFan, printingOnly: self.dashboardSettings.printingOnly_Fan },
                { title: "Temp Sensor Info from Enclosure Plugin", enabled: self.dashboardSettings.showSensorInfo, enableInFull: self.dashboardSettings.fsSensorInfo, printingOnly: self.dashboardSettings.printingOnly_SensorInfo },
                { title: "Command Widgets", enabled: self.dashboardSettings.showCommandWidgets, settingsId: "#dashboardCommandSettingsModal", enableInFull: self.dashboardSettings.fsCommandWidgets, printingOnly: self.dashboardSettings.printingOnly_CommandWidgets },
                { title: "Printer Message (M117)", enabled: self.dashboardSettings.showPrinterMessage, enableInFull: self.dashboardSettings.fsPrinterMessage, printingOnly: self.dashboardSettings.printingOnly_PrinterMessage, clearOn: self.dashboardSettings.clearOn_PrinterMessage },
                {
                    title: "Progress Gauges",
                    enabled: function () {
                        return self.dashboardSettings.showTimeProgress() || self.dashboardSettings.showProgress() || self.dashboardSettings.showLayerProgress() || self.dashboardSettings.showHeightProgress();
                    },
                    enable: function () {
                        self.dashboardSettings.showTimeProgress(true);
                        self.dashboardSettings.showProgress(true);
                        self.dashboardSettings.showLayerProgress(true);
                        self.dashboardSettings.showHeightProgress(true);
                    },
                    disable: function () {
                        self.dashboardSettings.showTimeProgress(false);
                        self.dashboardSettings.showProgress(false);
                        self.dashboardSettings.showLayerProgress(false);
                        self.dashboardSettings.showHeightProgress(false);
                    },
                    settings: [
                        { type: "radio", title: "Progress gauge type", setting: self.dashboardSettings.gaugetype, options: [{ name: "Circle", value: "circle" }, { name: "Bar", value: "bar" }] },
                        { type: "checkbox", title: "Show Time Progress Gauge", setting: self.dashboardSettings.showTimeProgress },
                        { type: "checkbox", title: "Show GCode Progress Gauge", setting: self.dashboardSettings.showProgress },
                        { type: "checkbox", title: "Show Layer Progress Gauge", setting: self.dashboardSettings.showLayerProgress },
                        { type: "checkbox", title: "Show Height Progress Gauge", setting: self.dashboardSettings.showHeightProgress }
                    ],
                    enableInFull: self.dashboardSettings.fsProgressGauges,
                    printingOnly: self.dashboardSettings.printingOnly_ProgressGauges,
                },
                {
                    title: "Layer Duration Graph",
                    enabled: self.dashboardSettings.showLayerGraph,
                    settings: [
                        { type: "radio", title: "Layer graph type", setting: self.dashboardSettings.layerGraphType, options: [{ name: "Normal", value: "normal" }, { name: "Last 40 Layers", value: "last40layers" }, { name: "Scrolling", value: "scrolling" }] }
                    ],
                    enableInFull: self.dashboardSettings.fsLayerGraph,
                    printingOnly: self.dashboardSettings.printingOnly_LayerGraph,
                    clearOn: self.dashboardSettings.clearOn_LayerGraph
                },
                { title: "Filament Widget", enabled: self.dashboardSettings.showFilament, settings: [{ type: "title", title: "The filament widget shows how much filament has been extruded. It can also show the time untill next filament change." }, { type: "checkbox", title: "Show time untill next filament change", setting: self.dashboardSettings.showFilamentChangeTime },], enableInFull: self.dashboardSettings.fsFilament, printingOnly: self.dashboardSettings.printingOnly_Filament, clearOn: self.dashboardSettings.clearOn_Filament },
                { title: "Feedrate", enabled: self.dashboardSettings.showFeedrate, settingsId: "#dashboardFeedrateSettingsModal", enableInFull: self.dashboardSettings.fsFeedrate, printingOnly: self.dashboardSettings.printingOnly_Feedrate, clearOn: self.dashboardSettings.clearOn_Feedrate },
                { title: "Webcam", enabled: self.dashboardSettings.showWebCam, settingsId: "#dashboardWebcamSettingsModal", enableInFull: self.dashboardSettings.fsWebCam, printingOnly: self.dashboardSettings.printingOnly_WebCam },
            ]);

        };

        self.enableWidget = function (widget) {
            if (widget.enable != null)
                widget.enable();
            else {
                widget.enabled(true)
            };
        };

        self.disableWidget = function (widget) {
            if (widget.disable != null)
                widget.disable();
            else {
                widget.enabled(false)
            };
        };

        self.onAfterBinding = function () {
            self.bindingDone = true;
        };

        self.doTempGaugeTicks = function () {
            var tempTicks = [];
            var temperatureTicks = self.dashboardSettings.temperatureTicks();
            if (temperatureTicks == 1) {
                temperatureTicks = 0;
            }

            for (i = 0; i < temperatureTicks; i++) {
                tempTicks.push(i / (temperatureTicks - 1));
            }

            self.tempGaugeTicks(tempTicks);
        };

        self.onSettingsBeforeSave = function () {
            if (self.webcam_perm) {
                self.switchToDefaultWebcam();
            }
            self.commandWidgetArray(self.dashboardSettings.commandWidgetArray());

            ko.utils.arrayForEach(self.widgets(), (widget) => {
                widget.release();
            });

            self.doTempGaugeTicks();
            self.RefreshThemeColors();
        };

        // self.fromCurrentData = function (data) {
        //     // console.log(data);
        // }

        // --- WEBCAM STUFF ---
        self.toggleWebcam = function () {
            if (self.webcamState() === 0) {
                self.switchToDefaultWebcam();
            } else {
                self._switchWebcam(0);
            }
        };

        self._disableWebcam = function () {
            var webcamImage = $("#dashboard_webcam_mjpg");

            webcamImage.attr("src", "");
            if (self.hls) {
                self.hls.destroy();
            }

            self.webcamHlsEnabled(false);
            self.webcamMjpgEnabled(false);
        }

        // Webcam mode switching functions adapted from octoprint control tab
        self._switchToMjpgWebcam = function (webcamUrl, nonce) {
            var webcamImage = $("#dashboard_webcam_mjpg");

            webcamImage.attr("src", webcamUrl + nonce);
            if (self.hls) {
                self.hls.destroy();
            }

            self.webcamHlsEnabled(false);
            self.webcamMjpgEnabled(true);
        };

        self._switchToHlsWebcam = function (webcamUrl) {
            var video = document.getElementById("dashboard_webcam_hls");

            if (video.canPlayType("application/vnd.apple.mpegurl")) {
                video.src = webcamUrl;
            } else if (Hls.isSupported()) {
                self.hls = new Hls();
                self.hls.loadSource(webcamUrl);
                self.hls.attachMedia(video);
            }

            $('#dashboard_webcam_mjpg').attr('src', "")

            self.webcamMjpgEnabled(false);
            self.webcamHlsEnabled(true);
        };

        const webcamLoadingIcon = "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8' standalone='no'%3F%3E%3Csvg xmlns:svg='http://www.w3.org/2000/svg' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.0' width='128px' height='128px' viewBox='-256 -256 640 640' xml:space='preserve'%3E%3Cg%3E%3Ccircle cx='16' cy='64' r='16' fill='%23000000' fill-opacity='1'/%3E%3Ccircle cx='16' cy='64' r='14.344' fill='%23000000' fill-opacity='1' transform='rotate(45 64 64)'/%3E%3Ccircle cx='16' cy='64' r='12.531' fill='%23000000' fill-opacity='1' transform='rotate(90 64 64)'/%3E%3Ccircle cx='16' cy='64' r='10.75' fill='%23000000' fill-opacity='1' transform='rotate(135 64 64)'/%3E%3Ccircle cx='16' cy='64' r='10.063' fill='%23000000' fill-opacity='1' transform='rotate(180 64 64)'/%3E%3Ccircle cx='16' cy='64' r='8.063' fill='%23000000' fill-opacity='1' transform='rotate(225 64 64)'/%3E%3Ccircle cx='16' cy='64' r='6.438' fill='%23000000' fill-opacity='1' transform='rotate(270 64 64)'/%3E%3Ccircle cx='16' cy='64' r='5.375' fill='%23000000' fill-opacity='1' transform='rotate(315 64 64)'/%3E%3CanimateTransform attributeName='transform' type='rotate' values='0 64 64;315 64 64;270 64 64;225 64 64;180 64 64;135 64 64;90 64 64;45 64 64' calcMode='discrete' dur='720ms' repeatCount='indefinite'%3E%3C/animateTransform%3E%3C/g%3E%3C/svg%3E";
        const webcamLoadingIconLight = "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8' standalone='no'%3F%3E%3Csvg xmlns:svg='http://www.w3.org/2000/svg' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.0' width='128px' height='128px' viewBox='-256 -256 640 640' xml:space='preserve'%3E%3Cg%3E%3Ccircle cx='16' cy='64' r='16' fill='%23ffffff' fill-opacity='1'/%3E%3Ccircle cx='16' cy='64' r='14.344' fill='%23ffffff' fill-opacity='1' transform='rotate(45 64 64)'/%3E%3Ccircle cx='16' cy='64' r='12.531' fill='%23ffffff' fill-opacity='1' transform='rotate(90 64 64)'/%3E%3Ccircle cx='16' cy='64' r='10.75' fill='%23ffffff' fill-opacity='1' transform='rotate(135 64 64)'/%3E%3Ccircle cx='16' cy='64' r='10.063' fill='%23ffffff' fill-opacity='1' transform='rotate(180 64 64)'/%3E%3Ccircle cx='16' cy='64' r='8.063' fill='%23ffffff' fill-opacity='1' transform='rotate(225 64 64)'/%3E%3Ccircle cx='16' cy='64' r='6.438' fill='%23ffffff' fill-opacity='1' transform='rotate(270 64 64)'/%3E%3Ccircle cx='16' cy='64' r='5.375' fill='%23ffffff' fill-opacity='1' transform='rotate(315 64 64)'/%3E%3CanimateTransform attributeName='transform' type='rotate' values='0 64 64;315 64 64;270 64 64;225 64 64;180 64 64;135 64 64;90 64 64;45 64 64' calcMode='discrete' dur='720ms' repeatCount='indefinite'%3E%3C/animateTransform%3E%3C/g%3E%3C/svg%3E";
        self._switchWebcam = function (cameraNum) {
            if (self.bindingDone && self.webcam_perm() && (!self.dashboardSettings.printingOnly_WebCam() || self.printerStateModel.isPrinting()) && self.dashboardSettings.showWebCam() && self.fsWebCam() && cameraNum != 0) {
                // Only change webcam stuff if the camera has changed or the webcam has been unloaded
                if (cameraNum != self.webcamState() || !(self.webcamHlsEnabled() || self.webcamMjpgEnabled())) {
                    self.webcamMjpgEnabled(true);
                    self.webcamHlsEnabled(false);
                    $('#dashboard_webcam_mjpg').attr('src', (document.fullscreenElement || dashboardIsFull) && !self.dashboardSettings.fullscreenUseThemeColors() ? webcamLoadingIconLight : webcamLoadingIcon);
                    setTimeout(() => {
                        if (self.dashboardSettings.enableDashMultiCam()) {
                            var webcamIndex = cameraNum - 1;
                            var webcam = self.dashboardSettings._webcamArray()[webcamIndex];

                            var url = webcam.url();
                            var nonce = webcam.disableNonce() ? '' : '?nonce_dashboard=' + new Date().getTime();

                            self.rotate(webcam.rotate());
                            self.flipH(webcam.flipH());
                            self.flipV(webcam.flipV());
                        } else {
                            self.rotate(self.settingsViewModel.settings.webcam.rotate90());
                            self.flipH(self.settingsViewModel.settings.webcam.flipH());
                            self.flipV(self.settingsViewModel.settings.webcam.flipV());

                            var nonce = self.dashboardSettings.disableWebcamNonce() ? '' : '?nonce_dashboard=' + new Date().getTime();
                            var url = self.settingsViewModel.settings.webcam.streamUrl();
                        }

                        var streamType = determineWebcamStreamType(url);
                        if (streamType == "mjpg") {
                            self._switchToMjpgWebcam(url, nonce);
                        } else if (streamType == "hls") {
                            self._switchToHlsWebcam(url);
                        } else {
                            throw "Unknown stream type " + streamType;
                        }

                        self.webcamState(cameraNum);
                    }, 100);
                }
            } else {
                self.webcamState(cameraNum);
                self._disableWebcam();
            }
        };

        self.switchWebcam = function () {
            self._switchWebcam(this);
        };

        self.dashboardFullClass = function () {
            var css = { dashboardOverlayFull: self.dashboardSettings.dashboardOverlayFull() };
            css['dashboard_full_ratio169_rotated'] = false;
            css['dashboard_full_ratio43_rotated'] = false;
            css['dashboard_full_ratio169_unrotated'] = false;
            css['dashboard_full_ratio43_unrotated'] = false;
            css['dashboard_full_' + self.webcamRatioClass() + (self.rotate() ? '_rotated' : '_unrotated')] = true;
            return css;
        };

        self.webcamRatioClass = function () {
            if (self.dashboardSettings.enableDashMultiCam()) {
                var webcamIndex = self.webcamState() - 1;
                var webcam = self.dashboardSettings._webcamArray()[webcamIndex];
                if (webcam == null) {
                    return 'ratio169';
                }
                return webcam.streamRatio() == '16:9' ? 'ratio169' : 'ratio43';
            } else {
                return self.settingsViewModel.settings.webcam.streamRatio() == '16:9' ? 'ratio169' : 'ratio43';
            }
        };

        // --- Time Display Code ---

        var formatTime = (date) => {
            var str = "";
            var ampm = "";
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var seconds = date.getSeconds();
            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            if (self.dashboardSettings.ETAUse12HTime()) {
                ampm = hours >= 12 ? ' pm' : ' am';
                hours = hours % 12;
                hours = hours ? hours : 12;
            }
            if (self.dashboardSettings.ETAShowSeconds()) {
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

        // TODO: move to a js update every second
        self.changeFilamentTimeLeft = ko.computed(() => {
            if (self.nextChange() != "-") {
                // TODO: Estimate time/move off of both total and previous moves/time
                moveProp = (self.nextChange() - self.currentMove()) / self.totalMoves();
                totalTime = self.printerStateModel.printTime() + self.printerStateModel.printTimeLeft();

                dt = new Date(2020, 1, 1, 0, 0, moveProp * totalTime);

                return formatTime(dt);
            } else {
                return "-";
            }
        });

        // --- 3/4 Gague Tick code ---
        self.tempGaugeSvgPath = ko.computed(() => {
            a = Math.PI / 180 * (360 - self.tempGaugeAngle()) / 2;
            offset = self.tempGaugeOffset();
            radius = self.tempGaugeRadius();
            leftX = (radius - radius * Math.sin(a) + offset).toFixed(2);
            leftY = (offset + radius + radius * Math.cos(a)).toFixed(2);
            rightX = (2 * radius * Math.sin(a)).toFixed(2);
            rightY = 0;

            return `M${leftX} ${leftY}a${radius} ${radius} 0 1 1 ${rightX} ${rightY}`;
        });

        self.tempGaugePathLen = ko.computed(() => {
            return (self.tempGaugeRadius() * Math.PI * self.tempGaugeAngle() / 180).toFixed(2);
        });

        self.tempGaugeViewBox = ko.computed(() => {
            return `0 0 ${2 * (self.tempGaugeRadius() + self.tempGaugeOffset())} ${2 * (self.tempGaugeRadius() + self.tempGaugeOffset())}`;
        });

        self.tempGaugeTickPath = (tick) => {
            a = Math.PI / 180 * (0.5 * (360 - self.tempGaugeAngle()) + self.tempGaugeAngle() * tick);
            offset = self.tempGaugeOffset();
            radius = self.tempGaugeRadius();
            inset = 10;
            outset = 20;

            innerX = (radius - (radius - inset) * Math.sin(a) + offset).toFixed(2);
            innerY = (offset + radius + (radius - inset) * Math.cos(a)).toFixed(2);
            outerX = (-(inset + outset) * Math.sin(a)).toFixed(2);
            outerY = ((inset + outset) * Math.cos(a)).toFixed(2);

            return `M${innerX} ${innerY}l${outerX} ${outerY}`;
        };

        self.tempGaugeTickTextX = (tick) => {
            a = Math.PI / 180 * (0.5 * (360 - self.tempGaugeAngle()) + self.tempGaugeAngle() * tick);
            offset = self.tempGaugeOffset();
            radius = self.tempGaugeRadius();
            textOutset = 35;

            textX = (radius - (radius + textOutset) * Math.sin(a) + offset).toFixed(2);

            return textX;
        };

        self.tempGaugeTickTextY = (tick) => {
            a = Math.PI / 180 * (0.5 * (360 - self.tempGaugeAngle()) + self.tempGaugeAngle() * tick);
            offset = self.tempGaugeOffset();
            radius = self.tempGaugeRadius();
            textOutset = 35;

            textY = (offset + radius + (radius + textOutset) * Math.cos(a)).toFixed(2);

            return textY;
        };


        // --- Text Formatting code ---
        self.formatFanOffset = function (fanSpeed) {
            fanSpeed = fanSpeed.replace("%", "");
            fanSpeed = fanSpeed.replace("-", 1);
            fanSpeed = fanSpeed.replace("Off", 1);
            if (fanSpeed) {
                return (self.tempGaugePathLen() * (1 - fanSpeed / 100)).toFixed(2);
            } else return 0;
        };

        self.formatProgressOffset = function (currentProgress) {
            if (currentProgress && !isNaN(currentProgress)) {
                return 339.292 * (1 - (currentProgress / 100));
            } else return "0.0";
        };

        self.formatTempOffset = function (temp, range) {
            if (temp) {
                return (self.tempGaugePathLen() * (1 - temp / range)).toFixed(2);
            } else return self.tempGaugePathLen();
        };

        self.formatConnectionstatus = function (currentStatus) {
            if (currentStatus) {
                return "Connected";
            } else return "Disconnected";
        };

        self.formatPercentage = function (percentage) {
            if (isNaN(percentage)) {
                return "-";
            }
            return percentage.toFixed(0) + '%';
        };

        // --- CMD Widget Code ---
        self.testCommandWidget = function () {
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

        self.addCommandWidget = function () {
            console.log("Adding command Widget");
            self.dashboardSettings.commandWidgetArray.push({ icon: ko.observable('command-icon.png'), name: ko.observable(''), command: ko.observable(''), enabled: ko.observable(false), interval: ko.observable(10), type: "text"});
        };

        self.removeCommandWidget = function (command) {
            console.log("Removing Command Widget");
            self.dashboardSettings.commandWidgetArray.remove(command);
        };

        // --- MultiCam Array Code ---
        self.addWebCam = function () {
            console.log("Adding Webcam");
            self.dashboardSettings._webcamArray.push({ name: ko.observable('name'), url: ko.observable('http://'), flipV: ko.observable(false), flipH: ko.observable(false), rotate: ko.observable(false), disableNonce: ko.observable(false), streamRatio: ko.observable('16:9') });
            self.switchToDefaultWebcam();
        };

        self.removeWebCam = function (webCam) {
            console.log("Removing Webcam");
            self.dashboardSettings._webcamArray.remove(webCam);
            self.switchToDefaultWebcam();
        };


        self.onTabChange = function (current, previous) {

            self.currentTab = current;

            if (current == "#tab_plugin_dashboard") {
                self._switchWebcam(self.webcamState());
                self.updateChartWidth();
            } else if (previous == "#tab_plugin_dashboard") {
                self._disableWebcam();
            };
        };


        self.renderChart = function (layerTimes, layerLabels) {
            if (self.bindingDone) {
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

                if (self.dashboardSettings.layerGraphType() == "last40layers") {
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

                if (self.dashboardSettings.layerGraphType() == "scrolling") {
                    calculatedWidth *= Math.max(labels.length / 40, 1)
                }

                self.chartWidth = calculatedWidth;

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
                            let interval = (self.dashboardSettings.layerGraphType() == "normal")
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

        self.updateChartWidth = function() {
            if (self.bindingDone) {
                var options = {
                    width: `${self.chartWidth}%`
                };
                self.layerGraph.update(options);
            }
        };

        self.gaugesCentreInGrid = function (type, index = 0, css = {}) {
            var last = [{}];
            var num = 0;
            var setLast = function (type, index = 0) {
                num++;
                last[1] = last[0];
                last[0] = { type: type, index: index };
            }
            if (self.temperatureModel.isOperational()) {
                if (self.dashboardSettings.enableTempGauges()) {
                    self.temperatureModel.tools().forEach(function (val, index) {
                        if (!self.dashboardSettings.hideHotend() || (self.dashboardSettings.hideHotend() && val.target() > 0))
                            setLast('tool', index);
                    });
                    if (self.temperatureModel.hasBed())
                        setLast('bed');
                    if (self.temperatureModel.hasChamber())
                        setLast('chamber');
                }
                if (self.dashboardSettings.showFan())
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
        self.onStartupComplete = function () {
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

            if (self.webcam_perm) {
                self.switchToDefaultWebcam();
            }

            self.layerGraph = new Chartist.Line('.ct-chart');

            self.doTempGaugeTicks();

            // full page
            if (dashboardIsFull) {
                self.isFull(true);
                $('#dashboardContainer').addClass('dashboard-full');
                $('body').css('overflow', 'hidden');
                $('.dashboardFullLoader').css('display', 'none');
                if (self.dashboardSettings.fullscreenUseThemeColors()) {
                    document.getElementById('dashboardContainer').style.setProperty('color', 'inherit', 'important');
                    $('#dashboardContainer').css('background-color', 'inherit');
                    $('#dashboardContainer').parents(':not(html):not(body)').css('background-color', 'inherit');
                }
            }

            self.RefreshThemeColors();

            try {
                self.settingsViewModel.settings.plugins.themeify.theme.subscribe(function (newValue) {
                    self.RefreshThemeColors();
                });
                self.settingsViewModel.settings.plugins.themeify.enabled.subscribe(function (newValue) {
                    self.RefreshThemeColors();
                });
            } catch { }

            try {
                self.settingsViewModel.settings.plugins.uicustomizer.theme.subscribe(function (newValue) {
                    self.RefreshThemeColors();
                });
            } catch { }

            self.dashboardSettings.useThemeifyColor.subscribe(function (newValue) {
                self.RefreshThemeColors();
            });

            self.settingsViewModel.settings.webcam.rotate90.subscribe(function (newValue) {
                self.rotate(newValue);
            });
            self.settingsViewModel.settings.webcam.flipH.subscribe(function (newValue) {
                self.flipH(newValue);
            });
            self.settingsViewModel.settings.webcam.flipV.subscribe(function (newValue) {
                self.flipV(newValue);
            });

            // This will likely need to stay even with other progress widgets moving to no special code
            self.printerStateModel.printTime.subscribe(function (newValue) {
                if (newValue == null || self.printerStateModel.printTimeLeft() == null || self.printerStateModel.printTimeLeft() == 0) {
                    self.timeProgressString(0.01);
                    self.timeProgressBarString("0%");
                } else {
                    self.timeProgressString((newValue / (newValue + self.printerStateModel.printTimeLeft())) * 100);
                    self.timeProgressBarString(Math.round((newValue / (newValue + self.printerStateModel.printTimeLeft())) * 100) + "%");
                }
            });

            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState == 'visible' && self.currentTab == '#tab_plugin_dashboard') {
                    self._switchWebcam(self.webcamState());
                } else {
                    self._disableWebcam();
                }
            });
        }

        self.onServerDisconnect = function () {
            self._disableWebcam();
        }

        self.onDataUpdaterReconnect = function () {
            if (self.currentTab == '#tab_plugin_dashboard') {
                self._switchWebcam(self.webcamState());
            } else {
                self._disableWebcam();
            }
        }

        var jobCanceling = false;
        var jobCancelI = null;
        var jobCancelOldText = '';
        self.jobCancel = function () {
            if (jobCanceling) {
                $('button.dashboardButton#job_cancel > span').html(jobCancelOldText);
                $('button.dashboardButton#job_cancel').removeClass('confirm');
                clearInterval(jobCancelI);
                jobCancelI = null;
                OctoPrint.job.cancel();
                jobCanceling = false;
            } else if (!self.printerStateModel.settings.feature_printCancelConfirmation()) {
                OctoPrint.job.cancel();
            } else {
                jobCanceling = true;
                jobCancelOldText = $('button.dashboardButton#job_cancel > span').html();
                $('button.dashboardButton#job_cancel').addClass('confirm');
                var t = 5;
                var setText = function () {
                    $('button.dashboardButton#job_cancel > span').html('Click again to confirm cancel <span>(' + t-- + ')</span>');
                }
                setTimeout(() => {
                    if (jobCanceling)
                        setText();
                }, 500);
                jobCancelI = setInterval(function () {
                    if (t < 0) {
                        $('button.dashboardButton#job_cancel > span').html(jobCancelOldText);
                        $('button.dashboardButton#job_cancel').removeClass('confirm');
                        clearInterval(jobCancelI);
                        jobCanceling = false;
                        jobCancelI = null;
                    } else
                        setText();
                }, 1000);
            }
        }
    };

    // view model class, parameters for constructor, container to bind to
    OCTOPRINT_VIEWMODELS.push({
        construct: DashboardViewModel,
        dependencies: ["temperatureViewModel", "printerStateViewModel", "printerProfilesViewModel", "connectionViewModel", "settingsViewModel", "controlViewModel", "enclosureViewModel", "loginStateViewModel"],
        optional: ["enclosureViewModel"],
        elements: ["#tab_plugin_dashboard", "#settings_plugin_dashboard"]
    });
});
