/*
 * OctoPrint-Dashboard v2 rewrite 
 *
 * Author: j7126, Stefan Cohen
 * License: AGPLv3
 */

OctoPrint.options.baseurl = "/";

function isNumeric(str) {
    if (typeof str != "string") return false
    return !isNaN(str) &&
        !isNaN(parseFloat(str))
}

// plugin
class DashboardPlugin {
    constructor() { }

    static identifier = '';

    get_widgets() {
        return [];
    }

    get_data_points() {
        return {};
    }
}

var Plugins = new Map();

// dashboard base
class Dashboard {
    #data;

    // Register Plugin called by plugins to register themselves 
    static RegisterPlugin(plugin) {
        var name = plugin.name;
        // only save this plugin if it does not exist already and is valid
        if (Plugins.has(name) || plugin.identifier != name) {
            return false;
        } else {
            Plugins.set(name, plugin);
            return true;
        }
    };

    // initial setup
    constructor() {
        var _self = this;

        // reactive variables 
        _self.#data = {
            layouts: null,
            layoutName: 'default', // current layout
            parentLayout: [], // path taken to get to the current layout
            lastBreakpoint: null,
            editing: false,
            editingWidget: false,
            editingWidgetIsNew: false,
            editingWidgetConfirmTypeChange: null,
            outlined: false,
            reducedAnimations: false,
            settingsDialogOpen: false,
            scrollable: true,
            showReconnectMessage: true,
            animating: false,
            widgets: {},
            data: {}, // the data received from the api
            settings: null
        };

        // Register plugins
        Plugins.forEach(function (plugin, key) {
            plugin = new plugin(); // instantiate plugin
            Plugins.set(key, plugin); // save the instantiated plugin
            var plugin_widgets = plugin.get_widgets(); // get the plugins widgets
            // try to register the plugin's widgets
            plugin_widgets.forEach(widget => {
                try {
                    // ensure that each widget's name is allowed
                    if (key == 'builtin' || (widget.value.startsWith("plugin_" + key) && widget.component.options.name == widget.value)) {
                        // if there is no settings component for this widget, create and empty settings component 
                        if (widget.settings == null) {
                            widget.settings = Vue.component(key + widget.value, {
                                data: function () {
                                    return {}
                                },
                                template: `<div></div>`
                            });
                        }
                        _self.#data.widgets[widget.value] = widget; // register the widget
                    }
                } catch { }
            });
            Object.assign(_self.#data.data, plugin.get_data_points());
        });

        Object.keys(_self.#data.data).forEach(key => {
            possibleDataPoints.data[key] = _self.#data.data[key];
            _self.#data.data[key] = null;
        });

        _self.layouts = {
            default: [
                { x: 0, y: 0, w: 1, h: 1, title: "CPU", type: 'text', data: [{ item: '%%cpuPercent%% %', showGraph: true }] },
                { x: 1, y: 0, w: 1, h: 1, title: "Mem", type: 'text', data: [{ item: '%%virtualMemPercent%% %' }] },
                { x: 2, y: 0, w: 1, h: 1, title: "Disk", type: 'text', data: [{ item: '%%diskUsagePercent%% %' }] },
                { x: 3, y: 0, w: 1, h: 1, title: "Net", type: 'text' },
                { x: 0, y: 1, w: 2, h: 1, title: "Hotend", type: 'text', data: [{ item: '%%temps.0.tool0.actual%%°C', round: 0 }] },
                { x: 2, y: 1, w: 2, h: 1, title: "Bed", type: 'text', data: [{ item: '%%temps.0.bed.actual%%°C', round: 0 }] },
                { x: 4, y: 2, w: 4, h: 4, title: "Webcam", type: 'img', data: { img: "webcam" }, navigate: 'webcam' },
                { x: 0, y: 5, w: 1, h: 1, title: "Printer", type: 'text', data: [{ item: '%%state.text%%' }] },
                { x: 1, y: 5, w: 2, h: 1, title: "Job", type: 'text', data: [{ item: '%%progress.completion%% %', round: 0, showProgress: true }] },
                { x: 3, y: 5, w: 1, h: 1, title: "Layer", type: 'text', data: [{ item: '%%currentLayer%% / %%totalLayers%%' }] },
                { x: 0, y: 6, w: 2, h: 1, title: "Print Time", type: 'text', data: [{ item: "%%progress.printTime%%" }] },
                { x: 2, y: 6, w: 2, h: 1, title: "Print Time Left", type: 'text', data: [{ item: "%%progress.printTimeLeft%%" }] },
            ],
            webcam: [
                { x: 0, y: 0, w: 8, h: 6, title: "Webcam", type: 'img', data: { img: "webcam" } },
            ]
        };

        Object.values(_self.layouts).forEach(layout => {
            layout.forEach((item, index) => {
                item.i = index;
                if (item.type == 'text') {
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
                }
            });
        });

        _self.#data.layouts = _self.layouts;

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
                    else {
                        setTimeout(() => {
                            _self.ready();
                        }, 500);
                    }
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

        // OctoPrint data points
        _self.#data.data = {
            "state": {
                "text": undefined,
                "flags": {
                    "operational": undefined,
                    "printing": undefined,
                    "cancelling": undefined,
                    "pausing": undefined,
                    "resuming": undefined,
                    "finishing": undefined,
                    "closedOrError": undefined,
                    "error": undefined,
                    "paused": undefined,
                    "ready": undefined,
                    "sdReady": undefined
                },
                "error": undefined
            },
            "progress": {
                "completion": undefined,
                "filepos": undefined,
                "printTime": undefined,
                "printTimeLeft": undefined,
                "printTimeLeftOrigin": undefined
            },
            "positionInFile": undefined,
            "printTime": undefined,
            "printTimeLeft": undefined,
            "printTimeLeftOrigin": undefined,
            "estimatedPrintTime": undefined,
            "averagePrintTime": undefined,
            "lastPrintTime": undefined,
            "fileByUser": undefined,
            "fileDate": undefined,
            "fileName": undefined,
            "fileDisplayName": undefined,
            "fileOrigin": undefined,
            "filePath": undefined,
            "fileSize": undefined,
            "bedTemp": undefined,
            "bedTarget": undefined,
            "chamberTemp": undefined,
            "chamberTarget": undefined,
            "toolTemp": undefined,
            "toolTarget": undefined,
            "job": {
                "file": {
                    "name": undefined,
                    "path": undefined,
                    "display": undefined,
                    "origin": undefined,
                    "size": undefined,
                    "date": undefined
                },
                "estimatedPrintTime": undefined,
                "averagePrintTime": undefined,
                "lastPrintTime": undefined,
                "filament": {
                    "tool0": {
                        "length": undefined,
                        "volume": undefined
                    }
                },
                "user": undefined
            },
            "currentZ": undefined,
            "offsets": undefined,
            "resends": {
                "count": undefined,
                "transmitted": undefined,
                "ratio": undefined
            },
            "serverTime": undefined,
            "temps": {
                "0": {
                    "time": undefined,
                    "tool0": {
                        "actual": undefined,
                        "target": undefined
                    },
                    "bed": {
                        "actual": undefined,
                        "target": undefined
                    },
                    "chamber": {
                        "actual": undefined,
                        "target": undefined
                    }
                }
            },
            "logs": {
                "0": undefined,
                "1": undefined,
                "2": undefined
            },
            "messages": {
                "0": undefined,
                "1": undefined
            },
            "busyFiles": {
                "0": {
                    "origin": undefined,
                    "path": undefined
                }
            },
            "updateReason": undefined,
            "layerTimes": undefined,
            "layerLabels": undefined,
            "maxX": undefined,
            "maxY": undefined,
            "maxZ": undefined,
            "minX": undefined,
            "minY": undefined,
            "minZ": undefined,
            "depth": undefined,
            "height": undefined,
            "width": undefined,
            "layerProgress": undefined,
            "averageLayerTimes": undefined,
            "fanSpeed": undefined
        };
        this.setupVue();
    }

    setupVue() {
        var _self = this;
        _self.vue = new Vue({
            el: '#app',
            data: _self.#data,
            watch: {
                reducedAnimations: function (val) {
                    if (val)
                        $('body').addClass('reducedAnimations');
                    else
                        $('body').removeClass('reducedAnimations');
                },
                settings: { // save settings when settings are changed
                    handler(newVal) {
                        _self.saveSettings(newVal);
                    },
                    deep: true
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
                _editingWidgetConfirmTypeChange: function () {
                    return this.editingWidgetConfirmTypeChange != null;
                },
                f_editingWidgetConfirmTypeChange: function () {
                    if (this.editingWidgetConfirmTypeChange == null)
                        return () => { };
                    return this.editingWidgetConfirmTypeChange;
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
                    this.layout.push({ x: 0, y: 0, w: 2, h: 2, i: this.layout.length, title: '', data: [], type: 'text' });
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
                editingWidgetTypeChange: function (value) {
                    if (value != this.layout[this.editingWidget].type) {
                        this.editingWidgetConfirmTypeChange = (event) => {
                            if (event.action == "CONTINUE") {
                                this.layout[this.editingWidget].data = null;
                                this.layout[this.editingWidget].type = '';
                                this.layout[this.editingWidget].type = value;
                            }
                            else {
                                var t = this.layout[this.editingWidget].type;
                                this.layout[this.editingWidget].type = '';
                                setTimeout(() => {
                                    this.layout[this.editingWidget].type = t;
                                }, 0);
                            }
                            this.editingWidgetConfirmTypeChange = null;
                        };
                    }
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
            },
        });
    }

    saveSettings(newVal) {
        var oldVal = this.tempSettings;
        if (this.updatingSettings == null) {
            var val = {};
            for (var prop in oldVal) {
                if (JSON.stringify(oldVal[prop]) !== JSON.stringify(newVal[prop]))
                    val[prop] = newVal[prop];
            }
            // TODO: handle error
            OctoPrint.settings.save(val).fail(err => { console.log("error") });
        } else {
            this.updatingSettings = null;
        }
    }

    updateSettings() {
        this.updatingSettings = true;
        OctoPrint.settings.get()
            .done(obj => {
                this.settings = obj;
                this.tempSettings = JSON.parse(JSON.stringify(obj));
            });
    }

    ready() {
        document.getElementById('loadSplash').style.display = 'none';
        this.#data.showReconnectMessage = false;
    }

    unready() {
        document.getElementById('loadSplash').style.display = 'block';
        this.#data.showReconnectMessage = true;
    }

    assignData(objTo, objFrom) {
        var self = this;
        for (var i in objFrom) {
            if (objFrom.hasOwnProperty(i)) {
                if (typeof objFrom[i] === 'object' && objFrom[i] !== null) {
                    if (objTo[i] == null || typeof objTo[i] !== 'object')
                        objTo[i] = {};
                    self.assignData(objTo[i], objFrom[i]);
                }
                else
                    self.vue.$set(objTo, i, objFrom[i]);
            }
        }
    }

    handleDashboardData(dataIn) {
        this.assignData(this.#data.data, dataIn);
    }

    handleOctoprintData(dataIn) {
        this.assignData(this.#data.data, dataIn);
    };

    get settings() {
        return this.#data.settings;
    }

    set settings(v) {
        this.#data.settings = v;
    }

    get data() {
        return this.#data.settings;
    }

    set data(v) {
        this.#data.settings = v;
    }
}

$(function () {
    window.Dashboard = new Dashboard();
});
