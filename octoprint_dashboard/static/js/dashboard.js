/*
 * OctoPrint-Dashboard v2 rewrite 
 *
 * Author: j7126, Stefan Cohen
 * License: AGPLv3
 */
// TODO: use babel 

OctoPrint.options.baseurl = "/";

function isNumeric(str) {
    if (typeof str != "string") return false
    return !isNaN(str) &&
        !isNaN(parseFloat(str))
}

class DashboardPlugin {
    constructor() { }

    static identifier = '';

    get_widgets() {
        return [];
    }
}

var Plugins = new Map();

class Dashboard {
    static RegisterPlugin(plugin) {
        var name = plugin.name;
        if (Plugins.has(name) || plugin.identifier != name) {
            return false;
        } else {
            Plugins.set(name, plugin);
            return true;
        }
    };

    constructor() {
        var _self = this;
        _self.data = {
            layouts: null,
            layoutName: 'default',
            parentLayout: [],
            lastBreakpoint: null,
            editing: false,
            editingWidget: false,
            editingWidgetIsNew: false,
            outlined: false,
            reducedAnimations: false,
            settingsDialogOpen: false,
            scrollable: true,
            showReconnectMessage: true,
            animating: false,
            widgets: {},
            data: {
                /* Octoprint Data (dashboard plugin) */
                totalLayers: 'Total number of layers in the current file',
                currentLayer: 'The currently printing layer number',
                currentHeight: 'The current height of the print',
                totalHeight: 'The total height of the print (when it is done)',
                feedrate: null,
                feedrateG0: null,
                feedrateG1: null,
                fanspeed: null,
                lastLayerDuration: null,
                lastLayerDurationInSeconds: null,
                averageLayerDuration: null,
                averageLayerDurationInSeconds: null,
                changeFilamentTimeLeftInSeconds: null,
                changeFilamentCount: null,
                cpuPercent: 'CPU utilisation as a percentage',
                cpuFreq: 'CPU frequency',
                virtualMemPercent: 'Memory utilisation percentage',
                diskUsagePercent: null,
                cpuTemp: 'CPU temperature',
                printerMessage: 'The message on the printer LCD',
                extrudedFilament: null,
                cmdResults: [],
                /* Octoprint Data (octoprint) */
                status: 'The printer status',
                progress: null,
                positionInFile: null,
                printTime: null,
                printTimeLeft: null,
                printTimeLeftOrigin: null,
                estimatedPrintTime: null,
                averagePrintTime: null,
                lastPrintTime: null,
                fileByUser: null,
                fileDate: null,
                fileName: null,
                fileDisplayName: null,
                fileOrigin: null,
                filePath: null,
                fileSize: null,
                bedTemp: null,
                bedTarget: null,
                chamberTemp: null,
                chamberTarget: null,
                toolTemp: null,
                toolTarget: null,
            },
            settings: null
        };
        Object.keys(_self.data.data).forEach(key => {
            possibleDataPoints.data[key] = _self.data.data[key];
            _self.data.data[key] = null;
        });

        Plugins.forEach(function (value, key) {
            var plugin = new value();
            Plugins.set(key, plugin);
            var plugin_widgets = plugin.get_widgets();
            plugin_widgets.forEach(widget => {
                try {
                    if (key == 'builtin' || (widget.value.startsWith("plugin_" + key) && widget.component.options.name == widget.value)) {
                        if (widget.settings == null) {
                            widget.settings = Vue.component(key + widget.value, {
                                data: function () {
                                    return {}
                                },
                                template: `<div></div>`
                            });
                        }
                        _self.data.widgets[widget.value] = widget;
                    }
                } catch { }
            });
        });

        _self.layouts = {
            default: [
                { x: 0, y: 0, w: 1, h: 1, title: "CPU", type: 'text', data: [{ item: '%%cpuPercent%% %', showGraph: true }] },
                { x: 1, y: 0, w: 1, h: 1, title: "Mem", type: 'text', data: [{ item: '%%virtualMemPercent%% %' }] },
                { x: 2, y: 0, w: 1, h: 1, title: "Disk", type: 'text', data: [{ item: '%%diskUsagePercent%% %' }] },
                { x: 3, y: 0, w: 1, h: 1, title: "Net", type: 'text' },
                { x: 0, y: 1, w: 2, h: 1, title: "Hotend", type: 'text', data: [{ item: '%%toolTemp%%°C', round: 0 }] },
                { x: 2, y: 1, w: 2, h: 1, title: "Bed", type: 'text', data: [{ item: '%%bedTemp%%°C', round: 0 }] },
                { x: 4, y: 2, w: 4, h: 4, title: "Webcam", type: 'img', img: "webcam", navigate: 'webcam' },
                { x: 0, y: 5, w: 1, h: 1, title: "Printer", type: 'text', data: [{ item: '%%status%%' }] },
                { x: 1, y: 5, w: 2, h: 1, title: "Job", type: 'text', data: [{ item: '%%progress%% %', round: 0, showProgress: true }] },
                { x: 3, y: 5, w: 1, h: 1, title: "Layer", type: 'text', data: [{ item: '%%currentLayer%% / %%totalLayers%%' }] },
                { x: 0, y: 6, w: 2, h: 1, title: "Print Time", type: 'text', data: [{ item: "%%printTime%%" }] },
                { x: 2, y: 6, w: 2, h: 1, title: "Print Time Left", type: 'text', data: [{ item: "%%printTimeLeft%%" }] },
            ],
            webcam: [
                { x: 0, y: 0, w: 8, h: 6, title: "Webcam", type: 'img', img: "webcam" },
            ]
        };

        Object.values(_self.layouts).forEach(layout => {
            layout.forEach((item, index) => {
                item.i = index;
                if (item.data) {
                    item.data.forEach(i => {
                        i.visible = true;
                        if (i.round == null)
                            i.round = null;
                        if (i.navigate == null)
                            i.navigate = null;
                        if (i.showProgress == null)
                            i.showProgress = false;
                        if (i.showGraph == null)
                            i.showGraph = false;
                        if (i.progressOptions == null)
                            i.progressOptions = { min: 0, max: 100 };
                    });
                } else
                    item.data = [];
            });
        });

        _self.data.layouts = _self.layouts;

        _self.updateSettings();

        var oldVersion, oldPluginHash, oldConfigHash, version, pluginHash, configHash;

        OctoPrint.socket.onMessage("connected", function (message) {
            OctoPrint.browser.passiveLogin().done(response => {
                if (response && response.name) {
                    OctoPrint.socket.sendAuth(response.name, response.session);
                    if (version == null)
                        version = message.data.version;
                    if (pluginHash == null)
                        pluginHash = message.data.plugin_hash;
                    if (configHash == null)
                        configHash = message.data.config_hash;
                    oldVersion = version;
                    version = message.data.version;
                    oldPluginHash = pluginHash;
                    pluginHash = message.data.plugin_hash;
                    oldConfigHash = configHash;
                    configHash = message.data.config_hash;
                    var versionChanged = oldVersion !== version;
                    var pluginsChanged = oldPluginHash !== pluginHash;
                    var configChanged = oldConfigHash !== configHash;
                    if (versionChanged || pluginsChanged || configChanged)
                        location.reload();
                    else
                        _self.ready();
                }
            });
        });

        OctoPrint.socket.onMessage("plugin", function (message) {
            if (message.data.plugin == "dashboard") {
                _self.handleDashboardData(message.data.data);
            }
        });

        OctoPrint.socket.onMessage("current", function (message) {
            _self.handleOctoprintData(message.data);
        });

        OctoPrint.socket.onMessage("event", function (message) {
            if (message.data.type == "SettingsUpdated") {
                _self.updateSettings();
            }
        });

        OctoPrint.socket.onReconnectAttempt = function () {
            _self.unready();
        };

        _self.vue = new Vue({
            el: '#app',
            data: _self.data,
            watch: {
                reducedAnimations: function (val) {
                    if (val)
                        $('body').addClass('reducedAnimations');
                    else
                        $('body').removeClass('reducedAnimations');
                }
            },
            computed: {
                layout: {
                    get: function () {
                        return this.layouts[this.layoutName];
                    },
                    set: function (newValue) {
                        this.layouts[this.layoutName] = newValue;
                    }
                },
                _editingWidget: function () {
                    return this.editingWidget !== false;
                },
                editingWidgetDialogDisallowClose: function () {
                    try {
                        return this.layout[this.editingWidget].title == '' || this.layout[this.editingWidget].type == '';
                    } catch { }
                    return true;
                },
                editingWidgetDialogCloseAction: function () {
                    try {
                        if (this.editingWidgetDialogDisallowClose)
                            return '';
                    } catch { }
                    return 'close';
                }
            },
            methods: {
                layoutUpdatedEvent: function () { },
                resizeEvent: function (i, newH, newW, newHPx, newWPx) { },
                layoutCreatedEvent: function (newLayout) {
                    var comp = this.$children[0];
                    var _ = this;
                    window.addEventListener("resize", function () {

                        if (_.lastBreakpoint !== comp.lastBreakpoint) {
                            console.log("resize!");
                        }

                        _.lastBreakpoint = comp.lastBreakpoint;

                    });
                },
                newItem: function (e) {
                    this.layout.push({ x: 0, y: 0, w: 2, h: 2, i: this.layout.length, title: '', data: [], type: '' });
                    this.editingWidget = this.layout.length - 1;
                    this.editingWidgetIsNew = true;
                },
                toggleEdit: function () {
                    this.editing = !this.editing;
                },
                editWidget: function (widget) {
                    this.editingWidget = widget;
                },
                editWidgetDialogClosed: function (value) {
                    var widget = this.editingWidget;
                    this.editingWidget = false;
                    this.editingWidgetIsNew = false;
                    if (value.action == 'DELETE') {
                        this.layout.splice(widget, 1);
                        this.layout.forEach((item, index) => item.i = index);
                    }
                    if (value.action == 'CANCEL')
                        this.layout.pop();
                },
                reconnect: function () {
                    location.reload();
                },
                navigate: function (widget) {
                    if (widget.navigate != null && this.layouts[widget.navigate] != null && !this.animating) {
                        var self = this;
                        var d = function () {
                            self.parentLayout.push(self.layoutName);
                            self.layoutName = widget.navigate;
                        };
                        if (this.reducedAnimations)
                            d();
                        else {
                            self.animating = true;
                            var el = $('#dashboardGridLayout');
                            $('body').css('overflow', 'hidden');
                            $('#loadSplash').css('display', 'block');
                            $('#loadSplash').css('z-index', '0');
                            el.css('margin-top', -1 * el.height());
                            setTimeout(() => {
                                d();
                                el.css('transition', 'none');
                                el.css('margin-top', '100vh');
                            }, 600);
                            setTimeout(() => {
                                el.css('transition', '');
                                el.css('margin-top', '0');
                            }, 650);
                            setTimeout(() => {
                                $('#loadSplash').css('display', 'none');
                                $('#loadSplash').css('z-index', '');
                                $('body').css('overflow', '');
                                self.animating = false;
                            }, 1250);
                        }
                    }
                },
                navigateBack: function () {
                    if (this.parentLayout.length >= 1 && !this.animating) {
                        var self = this;
                        var d = function () {
                            self.layoutName = self.parentLayout.pop();
                        }
                        if (this.reducedAnimations)
                            d();
                        else {
                            self.animating = true;
                            var el = $('#dashboardGridLayout');
                            $('body').css('overflow', 'hidden');
                            $('#loadSplash').css('display', 'block');
                            $('#loadSplash').css('z-index', '0');
                            el.css('margin-top', '100vh');
                            setTimeout(() => {
                                d();
                                el.css('transition', 'none');
                                el.css('margin-top', -1 * el.height());
                            }, 600);
                            setTimeout(() => {
                                el.css('transition', '');
                                el.css('margin-top', '0');
                            }, 650);
                            setTimeout(() => {
                                $('#loadSplash').css('display', 'none');
                                $('#loadSplash').css('z-index', '');
                                $('body').css('overflow', '');
                                self.animating = false;
                            }, 1250);
                        }
                    }
                }
            },
            mounted: function () {
                if (this.reducedAnimations)
                    $('body').addClass('reducedAnimations');
                OctoPrint.socket.connect();
            }
        });
    }

    updateSettings() {
        OctoPrint.settings.get()
            .done(obj => this.data.settings = obj);
    }

    ready() {
        document.getElementById('loadSplash').style.display = 'none';
        this.data.showReconnectMessage = false;
    }

    unready() {
        document.getElementById('loadSplash').style.display = 'block';
        this.data.showReconnectMessage = true;
    }

    handleDashboardData(dataIn) {
        if (dataIn.totalLayers) this.data.data.totalLayers = dataIn.totalLayers;
        if (dataIn.currentLayer) this.data.data.currentLayer = dataIn.currentLayer;
        if (dataIn.currentHeight) this.data.data.currentHeight = dataIn.currentHeight;
        if (dataIn.totalHeight) this.data.data.totalHeight = dataIn.totalHeight;
        if (dataIn.feedrate) this.data.data.feedrate = dataIn.feedrate;
        if (dataIn.feedrateG0) this.data.data.feedrateG0 = dataIn.feedrateG0;
        if (dataIn.feedrateG1) this.data.data.feedrateG1 = dataIn.feedrateG1;
        if (dataIn.fanspeed) this.data.data.fanspeed = dataIn.fanspeed;
        if (dataIn.lastLayerDuration) this.data.data.lastLayerDuration = dataIn.lastLayerDuration;
        if (dataIn.lastLayerDurationInSeconds) this.data.data.lastLayerDurationInSeconds = dataIn.lastLayerDurationInSeconds;
        if (dataIn.averageLayerDuration) this.data.data.averageLayerDuration = dataIn.averageLayerDuration;
        if (dataIn.averageLayerDurationInSeconds) this.data.data.averageLayerDurationInSeconds = dataIn.averageLayerDurationInSeconds;
        if (dataIn.changeFilamentTimeLeftInSeconds) this.data.data.changeFilamentTimeLeftInSeconds = dataIn.changeFilamentTimeLeftInSeconds;
        if (dataIn.changeFilamentCount) this.data.data.changeFilamentCount = dataIn.changeFilamentCount;
        if (dataIn.cpuPercent) this.data.data.cpuPercent = dataIn.cpuPercent;
        if (dataIn.cpuFreq) this.data.data.cpuFreq = dataIn.cpuFreq;
        if (dataIn.virtualMemPercent) this.data.data.virtualMemPercent = dataIn.virtualMemPercent;
        if (dataIn.diskUsagePercent) this.data.data.diskUsagePercent = dataIn.diskUsagePercent;
        if (dataIn.cpuTemp) this.data.data.cpuTemp = dataIn.cpuTemp;
        if (dataIn.printerMessage) this.data.data.printerMessage = dataIn.printerMessage;
        if (dataIn.extrudedFilament) this.data.data.extrudedFilament = dataIn.extrudedFilament;
    }

    handleOctoprintData(dataIn) {
        // state
        if (dataIn.state.text) this.data.data.status = dataIn.state.text;
        // progress
        if (dataIn.progress.completion) this.data.data.progress = dataIn.progress.completion;
        if (dataIn.progress.printTime) this.data.data.printTime = dataIn.progress.printTime;
        if (dataIn.progress.printTimeLeft) this.data.data.printTimeLeft = dataIn.progress.printTimeLeft;
        // temps
        if (dataIn.temps[0]) {
            if (dataIn.temps[0].bed.actual) this.data.data.bedTemp = dataIn.temps[0].bed.actual;
            if (dataIn.temps[0].bed.target) this.data.data.bedTarget = dataIn.temps[0].bed.target;
            if (dataIn.temps[0].chamber.actual) this.data.data.chamberTemp = dataIn.temps[0].chamber.actual;
            if (dataIn.temps[0].chamber.target) this.data.data.chamberTarget = dataIn.temps[0].chamber.target;
            if (dataIn.temps[0].tool0.actual) this.data.data.toolTemp = dataIn.temps[0].tool0.actual;
            if (dataIn.temps[0].tool0.target) this.data.data.toolTarget = dataIn.temps[0].tool0.target;
        }
    };
}

$(function () {
    window.dashboard = new Dashboard();
});
