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

$(function () {
    var data = {
        layouts: null,
        layout: null,
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
        data: {
            /* Octoprint Data (dashboard plugin) */
            totalLayer: 'Total number of layers in the current file',
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

    Object.keys(data.data).forEach(key => {
        possibleDataPoints.data[key] = data.data[key];
        data.data[key] = null;
    });

    var ready = function () {
        document.getElementById('loadSplash').style.display = 'none';
        data.showReconnectMessage = false;
    };

    var unready = function () {
        document.getElementById('loadSplash').style.display = 'block';
        data.showReconnectMessage = true;
    };

    var layouts = {
        default: [
            { x: 0, y: 0, w: 1, h: 1, title: "CPU", data: [{ item: '%%cpuPercent%% %', showGraph: true }] },
            { x: 1, y: 0, w: 1, h: 1, title: "Mem", data: [{ item: '%%virtualMemPercent%% %' }] },
            { x: 2, y: 0, w: 1, h: 1, title: "Disk", data: [{ item: '%%diskUsagePercent%% %' }] },
            { x: 3, y: 0, w: 1, h: 1, title: "Net" },
            { x: 0, y: 1, w: 2, h: 1, title: "Hotend", data: [{ item: '%%toolTemp%%°C', round: 0 }] },
            { x: 2, y: 1, w: 2, h: 1, title: "Bed", data: [{ item: '%%bedTemp%%°C', round: 0 }] },
            { x: 4, y: 2, w: 4, h: 4, title: "Webcam", img: "webcam", navigate: 'webcam' },
            { x: 0, y: 5, w: 1, h: 1, title: "Printer", data: [{ item: '%%status%%' }] },
            { x: 1, y: 5, w: 2, h: 1, title: "Job", data: [{ item: '%%progress%% %', round: 0, showProgress: true }] },
            { x: 3, y: 5, w: 1, h: 1, title: "Layer", data: [{ item: '%%currentLayer%% / %%totalLayer%%' }] },
            { x: 0, y: 6, w: 2, h: 1, title: "Total Print Time", data: [{ item: "%%printTime%%" }] },
            { x: 2, y: 6, w: 2, h: 1, title: "Print Time Left", data: [{ item: "%%printTimeLeft%%" }] },
        ],
        webcam: [
            { x: 0, y: 0, w: 8, h: 6, title: "Webcam", img: "webcam" },
        ]
    };

    var widgetItemDefaults = {
        item: "",
        round: null,
        showProgress: false,
        progressOptions:
        {
            min: 0,
            max: 100
        },
        visible: true,
        showGraph: false,
        navigate: null
    };
    Object.values(layouts).forEach(layout => {
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

    data.layouts = layouts;
    data.layout = layouts.default;

    var updateSettings = () => {
        OctoPrint.settings.get()
            .done(obj => data.settings = obj);
    };
    updateSettings();

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
                    ready();
            }
        });
    });

    OctoPrint.socket.onMessage("plugin", function (message) {
        if (message.data.plugin == "dashboard") {
            handlePluginData(message.data.data);
        }
    });

    OctoPrint.socket.onMessage("current", function (message) {
        handleOctoprintData(message.data);
    });

    OctoPrint.socket.onMessage("event", function (message) {
        if (message.data.type == "SettingsUpdated") {
            updateSettings();
        }
    });

    OctoPrint.socket.onReconnectAttempt = unready;

    var handlePluginData = (dataIn) => {
        if (dataIn.totalLayer) data.data.totalLayer = dataIn.totalLayer;
        if (dataIn.currentLayer) data.data.currentLayer = dataIn.currentLayer;
        if (dataIn.currentHeight) data.data.currentHeight = dataIn.currentHeight;
        if (dataIn.totalHeight) data.data.totalHeight = dataIn.totalHeight;
        if (dataIn.feedrate) data.data.feedrate = dataIn.feedrate;
        if (dataIn.feedrateG0) data.data.feedrateG0 = dataIn.feedrateG0;
        if (dataIn.feedrateG1) data.data.feedrateG1 = dataIn.feedrateG1;
        if (dataIn.fanspeed) data.data.fanspeed = dataIn.fanspeed;
        if (dataIn.lastLayerDuration) data.data.lastLayerDuration = dataIn.lastLayerDuration;
        if (dataIn.lastLayerDurationInSeconds) data.data.lastLayerDurationInSeconds = dataIn.lastLayerDurationInSeconds;
        if (dataIn.averageLayerDuration) data.data.averageLayerDuration = dataIn.averageLayerDuration;
        if (dataIn.averageLayerDurationInSeconds) data.data.averageLayerDurationInSeconds = dataIn.averageLayerDurationInSeconds;
        if (dataIn.changeFilamentTimeLeftInSeconds) data.data.changeFilamentTimeLeftInSeconds = dataIn.changeFilamentTimeLeftInSeconds;
        if (dataIn.changeFilamentCount) data.data.changeFilamentCount = dataIn.changeFilamentCount;
        if (dataIn.cpuPercent) data.data.cpuPercent = dataIn.cpuPercent;
        if (dataIn.cpuFreq) data.data.cpuFreq = dataIn.cpuFreq;
        if (dataIn.virtualMemPercent) data.data.virtualMemPercent = dataIn.virtualMemPercent;
        if (dataIn.diskUsagePercent) data.data.diskUsagePercent = dataIn.diskUsagePercent;
        if (dataIn.cpuTemp) data.data.cpuTemp = dataIn.cpuTemp;
        if (dataIn.printerMessage) data.data.printerMessage = dataIn.printerMessage;
        if (dataIn.extrudedFilament) data.data.extrudedFilament = dataIn.extrudedFilament;
    };

    var handleOctoprintData = (dataIn) => {
        // state
        if (dataIn.state.text) data.data.status = dataIn.state.text;
        // progress
        if (dataIn.progress.completion) data.data.progress = dataIn.progress.completion;
        if (dataIn.progress.printTime) data.data.printTime = dataIn.progress.printTime;
        if (dataIn.progress.printTimeLeft) data.data.printTimeLeft = dataIn.progress.printTimeLeft;
        // temps
        if (dataIn.temps[0]) {
            if (dataIn.temps[0].bed.actual) data.data.bedTemp = dataIn.temps[0].bed.actual;
            if (dataIn.temps[0].bed.target) data.data.bedTarget = dataIn.temps[0].bed.target;
            if (dataIn.temps[0].chamber.actual) data.data.chamberTemp = dataIn.temps[0].chamber.actual;
            if (dataIn.temps[0].chamber.target) data.data.chamberTarget = dataIn.temps[0].chamber.target;
            if (dataIn.temps[0].tool0.actual) data.data.toolTemp = dataIn.temps[0].tool0.actual;
            if (dataIn.temps[0].tool0.target) data.data.toolTarget = dataIn.temps[0].tool0.target;
        }
    };

    var mdcAutoInit = function () {
        setTimeout(() => {
            window.mdc.autoInit();
        }, 0);
    };

    new Vue({
        el: '#app',
        delimiters: ['[[', ']]'],
        data: data,
        watch: {
            reducedAnimations: function (val) {
                if (val)
                    $('body').addClass('reducedAnimations');
                else
                    $('body').removeClass('reducedAnimations');
            }
        },
        computed: {
            itemDataString: function () {
                return item => {
                    var val;
                    if (item.data && item.data[0]) {
                        val = item.data[0].item.replace(/(%%[^%]*%%)/gi, (match) => {
                            match.replace(/(?<=%%)(.*)(?=%%)/, (m) => match = m);
                            if (isNumeric(this.data[match]))
                                this.data[match] = parseFloat(this.data[match]);
                            if (typeof this.data[match] == 'number' && item.data[0].round != null)
                                return this.data[match].toFixed(item.data[0].round);
                            return this.data[match];
                        });
                    } else
                        val = false;
                    if (typeof val == 'string' && val.includes('null')) {
                        val = val.replaceAll("null", "-");
                    }
                    return val;
                };
            },
            itemDataRaw: function () {
                return (item, index = 0) => {
                    var val;
                    if (item.data && item.data[index]) {
                        var matches = item.data[index].item.match(/(?<=%%)(.*)(?=%%)/);
                        if (matches != null)
                            val = this.data[matches[0]];
                        else
                            val = false;
                    } else
                        val = false;
                    return val;
                };
            },
            widgetProgress: function () {
                return widget => {
                    var progress = null;
                    widget.data.forEach((item, index) => {
                        if (progress == null && item.showProgress)
                            progress = (this.itemDataRaw(widget, index = index) - item.progressOptions.min) / item.progressOptions.max;
                    });
                    if (progress == null)
                        progress = 0;
                    return progress;
                };
            },
            widgetGraph: function () {
                return widget => {
                    var progress = null;
                    widget.data.forEach((item, index) => {
                        if (progress == null && item.showGraph)
                            progress = this.itemDataRaw(widget, index = index);
                    });
                    if (progress == null)
                        progress = 0;
                    return progress;
                };
            },
            itemShowProgress: function () {
                return item => {
                    var showProgress = false;
                    try {
                        item.data.forEach(item => { if (item.showProgress) showProgress = true; });
                    } catch { }
                    return item.data && item.data[0] && showProgress;
                };
            },
            itemShowGraph: function () {
                return item => {
                    var showGraph = false;
                    try {
                        item.data.forEach(item => { if (item.showGraph) showGraph = true; });
                    } catch { }
                    return item.data && item.data[0] && showGraph;
                };
            },
            getImg: function () {
                return img => {
                    if (img == "webcam")
                        return this.settings && this.settings.webcam && this.settings.webcam.streamUrl;
                    return "";
                };
            },
            _editingWidget: function () {
                return this.editingWidget !== false;
            },
            editingWidgetDialogDisallowClose: function () {
                try {
                    return this.layout[this.editingWidget].title == '';
                } catch { }
                return true;
            },
            editingWidgetDialogCloseAction: function () {
                try {
                    if (this.editingWidgetDialogDisallowClose)
                        return '';
                } catch { }
                return 'close';
            },
            itemDataRequiringOptionDisabled: function () {
                return item => {
                    if (item.item.match(/(%%[^%]*%%)/) == null) {
                        item.showGraph = false;
                        item.showProgress = false;
                        return true;
                    }
                    return false;
                };
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
                this.layout.push({ x: 0, y: 0, w: 2, h: 2, i: this.layout.length, title: '', data: [] });
                this.editingWidget = this.layout.length - 1;
                this.editingWidgetIsNew = true;
                mdcAutoInit();
            },
            toggleEdit: function () {
                this.editing = !this.editing;
            },
            editWidget: function (widget) {
                this.editingWidget = widget;
                mdcAutoInit();
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
            widgetItemValueChange: function (e, item) {
                if (e)
                    item.round = 0;
                else
                    item.round = null;
                mdcAutoInit();
            },
            widgetAddItem: function () {
                this.layout[this.editingWidget].data.push(widgetItemDefaults);
                mdcAutoInit();
            },
            widgetRemoveItem: function () {
                this.layout[this.editingWidget].data.pop();
            },
            mdcAutoInit: mdcAutoInit,
            navigate: function (widget) {
                if (widget.navigate != null && this.layouts[widget.navigate] != null) {
                    var self = this;
                    var d = function () {
                        self.parentLayout.push(self.layoutName);
                        self.layoutName = widget.navigate;
                        self.layout = self.layouts[widget.navigate];
                    };
                    if (this.reducedAnimations)
                        d();
                    else {
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
                        }, 1250);
                    }
                }
            },
            navigateBack: function () {
                if (this.parentLayout.length >= 1) {
                    var self = this;
                    var d = function () {
                        var parent = self.parentLayout.pop();
                        self.layoutName = parent;
                        self.layout = self.layouts[parent];
                        setTimeout(() => {
                            MDCRipple = window.mdc.ripple.MDCRipple;
                            document.querySelectorAll('.mdc-icon-button.navigateButton').forEach((button) => {
                                const iconButtonRipple = new MDCRipple(button);
                                iconButtonRipple.unbounded = true;
                            });
                        }, 0);
                    }
                    if (this.reducedAnimations)
                        d();
                    else {
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
                        }, 1250);
                    }
                }
            }
        },
        mounted: function () {
            MDCRipple = window.mdc.ripple.MDCRipple;
            window.mdc.autoInit();
            document.querySelectorAll('.mdc-icon-button').forEach((button) => {
                const iconButtonRipple = new MDCRipple(button);
                iconButtonRipple.unbounded = true;
            });
            if (this.reducedAnimations)
                $('body').addClass('reducedAnimations');
            OctoPrint.socket.connect();
        }
    });
});
