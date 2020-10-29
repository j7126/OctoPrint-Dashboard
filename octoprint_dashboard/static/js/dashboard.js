/*
 * OctoPrint-Dashboard v2 rewrite 
 *
 * Author: j7126, Stefan Cohen
 * License: AGPLv3
 */
OctoPrint.options.baseurl = "/";

$(function () {
    var data = {
        layout: null,
        lastBreakpoint: null,
        editing: false,
        data: {
            totalLayer: null,
            currentLayer: null,
            currentHeight: null,
            totalHeight: null,
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
            cpuPercent: null,
            cpuFreq: null,
            virtualMemPercent: null,
            diskUsagePercent: null,
            cpuTemp: null,
            printerMessage: null,
            extrudedFilament: null,
            cmdResults: [],
            status: null,
            progress: null,
            bedTemp: null,
            bedTarget: null,
            chamberTemp: null,
            chamberTarget: null,
            toolTemp: null,
            toolTarget: null,
        },
        settings: null
    };

    var layout = [
        { x: 0, y: 0, w: 1, h: 1, title: "CPU", data: [{ item: '%%cpuPercent%% %' }] },
        { x: 1, y: 0, w: 1, h: 1, title: "Mem", data: [{ item: '%%virtualMemPercent%% %' }] },
        { x: 2, y: 0, w: 1, h: 1, title: "Disk", data: [{ item: '%%diskUsagePercent%% %' }] },
        { x: 3, y: 0, w: 1, h: 1, title: "Net" },
        { x: 0, y: 1, w: 2, h: 1, title: "Hotend", data: [{ item: '%%toolTemp%%°C', round: 0 }] },
        { x: 2, y: 1, w: 2, h: 1, title: "Bed", data: [{ item: '%%bedTemp%%°C', round: 0 }] },
        { x: 0, y: 2, w: 4, h: 4, title: "Webcam", img: "webcam" },
        { x: 0, y: 5, w: 1, h: 1, title: "Printer", data: [{ item: '%%status%%' }] },
        { x: 1, y: 5, w: 2, h: 1, title: "Job", data: [{ item: '%%progress%% %', round: 0, showProgress: true }] },
        { x: 3, y: 5, w: 1, h: 1, title: "Etc" },
        { x: 0, y: 6, w: 4, h: 1, title: "Whatever" },
    ];
    layout.forEach((item, index) => item.i = index);

    var responsiveLayouts = { md: layout, sm: layout, xs: layout, xxs: layout };

    responsiveLayouts.md[6].x = 4;
    responsiveLayouts.lg = responsiveLayouts.md;
    responsiveLayouts.xlg = responsiveLayouts.md;

    data.layout = layout;
    data.responsiveLayouts = responsiveLayouts;

    var updateSettings = () => {
        OctoPrint.settings.get()
            .done(obj => data.settings = obj);
    };
    updateSettings();

    OctoPrint.socket.connect();

    OctoPrint.socket.onMessage("connected", function (message) {
        OctoPrint.browser.passiveLogin().done(response => {
            if (response && response.name) {
                OctoPrint.socket.sendAuth(response.name, response.session);
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

    new Vue({
        el: '#app',
        delimiters: ['[[', ']]'],
        data: data,
        computed: {
            itemDataString: function () {
                return item => {
                    var val;
                    if (item.data && item.data[0]) {
                        val = item.data[0].item.replace(/%%.*%%/gi, (match) => {
                            match.replace(/(?<=%%)(.*)(?=%%)/, (m) => match = m);
                            if (typeof this.data[match] == 'number' && item.data[0].round != null)
                                return this.data[match].toFixed(item.data[0].round);
                            return this.data[match];
                        });
                    } else
                        val = false;
                    if (typeof val == 'string' && val.includes('null')) {
                        val = 'no data';
                    }
                    return val;
                };
            },
            itemDataRaw: function () {
                return item => {
                    var val;
                    if (item.data && item.data[0]) {
                        val = this.data[item.data[0].item.match(/(?<=%%)(.*)(?=%%)/)[0]];
                    } else
                        val = false;
                    return val;
                };
            },
            itemShowProgress: function () {
                return item => item.data && item.data[0] && item.data[0].showProgress;
            },
            getImg: function () {
                return img => {
                    if (img == "webcam")
                        return this.settings && this.settings.webcam && this.settings.webcam.streamUrl;
                    return "";
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
                var comp = this.$children[0];
                comp.layout.push({ x: 0, y: 0, w: 2, h: 2, i: comp.layout.length, title: comp.layout.length });
            },
            toggleEdit: function () {
                this.editing = !this.editing;
            }
        },
        mounted: function () {
            MDCRipple = window.mdc.ripple.MDCRipple;
            window.mdc.autoInit();
            document.querySelectorAll('.mdc-icon-button').forEach((button) => {
                const iconButtonRipple = new MDCRipple(button);
                iconButtonRipple.unbounded = true;
            });
        }
    });
});
