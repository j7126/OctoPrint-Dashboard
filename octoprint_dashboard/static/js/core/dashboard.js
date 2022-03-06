/*
 * OctoPrint-Dashboard v2 rewrite 
 *
 * Author: j7126, Stefan Cohen
 * License: AGPLv3
 */

export default class Dashboard {
    #data;

    static Plugins = new Map();

    // Register Plugin called by plugins to register themselves 
    static RegisterPlugin(plugin) {
        var name = plugin.name;
        // only save this plugin if it does not exist already and is valid
        if (this.Plugins.has(name) || plugin.identifier != name) {
            return false;
        } else {
            this.Plugins.set(name, plugin);
            return true;
        }
    }

    // Register plugins
    registerPlugins() {
        var slef = this;

        Dashboard.Plugins.forEach(function (plugin, key) {
            plugin = new plugin(); // instantiate plugin
            Dashboard.Plugins.set(key, plugin); // save the instantiated plugin
            var plugin_widgets = plugin.get_widgets(); // get the plugins widgets
            // try to register the plugin's widgets
            plugin_widgets.forEach(widget => {
                // ensure that each widget's name is allowed
                if ((key == '_dashboard' && widget.name.startsWith('widget_')) || widget.name.startsWith('plugin_' + key)) {
                    widget = new widget(); // instantiate widget
                    slef.#data.widgets[widget.constructor.name] = widget; // register the widget
                }
            });
            Object.assign(slef.#data.data, plugin.get_data_points());
        });
    }

    theme = {
        primary: getComputedStyle(document.documentElement).getPropertyValue('--mdc-theme-primary'),
        secondary: getComputedStyle(document.documentElement).getPropertyValue('--mdc-theme-secondary'),
        accent: '#82B1FF',
        error: '#FF5252',
        info: '#2196F3',
        success: '#4CAF50',
        warning: '#FFC107',
    };

    // initial setup
    constructor() {
        var slef = this;

        // reactive variables 
        slef.#data = {
            layouts: null,
            layoutName: 'default', // current layout
            parentLayout: [], // path taken to get to the current layout
            lastBreakpoint: null,
            editing: false,
            editingWidget: false,
            editingWidgetIsNew: false,
            editingWidgetConfirmTypeChange: 0,
            is_editingWidget: false,
            settingsDialogOpen: false,
            settingsTab: null,
            scrollable: true,
            showReconnectMessage: false,
            animating: false,
            widgets: {},
            data: {}, // the data received from the api
            dataNames: [],
            settings: null,
            requiredRule: [(v) => v == '' ? false : true],
        };

        // Register Plugins
        slef.registerPlugins();

        Object.keys(slef.#data.data).forEach(key => {
            slef.#data.dataNames.push({ name: key, description: slef.#data.data[key] });
            slef.#data.data[key] = null;
        });

        slef.layouts = {
            default: [
                { x: 0, y: 0, w: 1, h: 1, title: 'CPU', type: 'widget_text', data: [{ item: '%%cpuPercent%% %', showGraph: true }] },
                { x: 1, y: 0, w: 1, h: 1, title: 'Mem', type: 'widget_text', data: [{ item: '%%virtualMemPercent%% %' }] },
                { x: 2, y: 0, w: 1, h: 1, title: 'Disk', type: 'widget_text', data: [{ item: '%%diskUsagePercent%% %' }] },
                { x: 3, y: 0, w: 1, h: 1, title: 'Net', type: 'widget_text' },
                { x: 0, y: 1, w: 2, h: 1, title: 'Hotend', type: 'widget_text', data: [{ item: '%%temps.0.tool0.actual%%°C', round: 0 }] },
                { x: 2, y: 1, w: 2, h: 1, title: 'Bed', type: 'widget_text', data: [{ item: '%%temps.0.bed.actual%%°C', round: 0 }] },
                { x: 4, y: 2, w: 4, h: 4, title: 'Webcam', type: 'widget_img', data: { img: 'webcam' }, navigate: 'webcam' },
                { x: 0, y: 5, w: 1, h: 1, title: 'Printer', type: 'widget_text', data: [{ item: '%%state.text%%' }] },
                { x: 1, y: 5, w: 2, h: 1, title: 'Job', type: 'widget_text', data: [{ item: '%%progress.completion%% %', round: 0, showProgress: true }] },
                { x: 3, y: 5, w: 1, h: 1, title: 'Layer', type: 'widget_text', data: [{ item: '%%currentLayer%% / %%totalLayers%%' }] },
                { x: 0, y: 6, w: 2, h: 1, title: 'Print Time', type: 'widget_text', data: [{ item: '%%progress.printTime%%' }] },
                { x: 2, y: 6, w: 2, h: 1, title: 'Print Time Left', type: 'widget_text', data: [{ item: '%%progress.printTimeLeft%%' }] },
            ],
            webcam: [
                { x: 0, y: 0, w: 6, h: 6, title: 'Webcam', type: 'widget_img', data: { img: 'webcam' } },
            ]
        };

        Object.values(slef.layouts).forEach(layout => {
            layout.forEach((item, index) => {
                item.i = index;
                item.typeKey = false;
                if (item.type == 'widget_text') {
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

        slef.#data.layouts = slef.layouts;

        slef.updateSettings();

        var oldVersion, oldPluginHash, oldConfigHash, version, pluginHash, configHash;

        OctoPrint.socket.onMessage('connected', function (message) {
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
                            slef.ready();
                        }, 500);
                    }
                }
            });
        });

        OctoPrint.socket.onMessage('plugin', function (message) {
            if (message.data.plugin == 'dashboard') {
                slef.handleDashboardData(message.data.data);
            }
        });

        OctoPrint.socket.onMessage('current', function (message) {
            slef.handleOctoprintData(message.data);
        });

        OctoPrint.socket.onMessage('event', function (message) {
            if (message.data.type == 'SettingsUpdated') {
                slef.updateSettings();
            }
        });

        OctoPrint.socket.onReconnectAttempt = function () {
            slef.unready();
        };

        // OctoPrint data points
        slef.#data.data = {
            'state': {
                'text': undefined,
                'flags': {
                    'operational': undefined,
                    'printing': undefined,
                    'cancelling': undefined,
                    'pausing': undefined,
                    'resuming': undefined,
                    'finishing': undefined,
                    'closedOrError': undefined,
                    'error': undefined,
                    'paused': undefined,
                    'ready': undefined,
                    'sdReady': undefined
                },
                'error': undefined
            },
            'progress': {
                'completion': undefined,
                'filepos': undefined,
                'printTime': undefined,
                'printTimeLeft': undefined,
                'printTimeLeftOrigin': undefined
            },
            'positionInFile': undefined,
            'printTime': undefined,
            'printTimeLeft': undefined,
            'printTimeLeftOrigin': undefined,
            'estimatedPrintTime': undefined,
            'averagePrintTime': undefined,
            'lastPrintTime': undefined,
            'fileByUser': undefined,
            'fileDate': undefined,
            'fileName': undefined,
            'fileDisplayName': undefined,
            'fileOrigin': undefined,
            'filePath': undefined,
            'fileSize': undefined,
            'bedTemp': undefined,
            'bedTarget': undefined,
            'chamberTemp': undefined,
            'chamberTarget': undefined,
            'toolTemp': undefined,
            'toolTarget': undefined,
            'job': {
                'file': {
                    'name': undefined,
                    'path': undefined,
                    'display': undefined,
                    'origin': undefined,
                    'size': undefined,
                    'date': undefined
                },
                'estimatedPrintTime': undefined,
                'averagePrintTime': undefined,
                'lastPrintTime': undefined,
                'filament': {
                    'tool0': {
                        'length': undefined,
                        'volume': undefined
                    }
                },
                'user': undefined
            },
            'currentZ': undefined,
            'offsets': undefined,
            'resends': {
                'count': undefined,
                'transmitted': undefined,
                'ratio': undefined
            },
            'serverTime': undefined,
            'temps': {
                '0': {
                    'time': undefined,
                    'tool0': {
                        'actual': undefined,
                        'target': undefined
                    },
                    'bed': {
                        'actual': undefined,
                        'target': undefined
                    },
                    'chamber': {
                        'actual': undefined,
                        'target': undefined
                    }
                }
            },
            'logs': {
                '0': undefined,
                '1': undefined,
                '2': undefined
            },
            'messages': {
                '0': undefined,
                '1': undefined
            },
            'busyFiles': {
                '0': {
                    'origin': undefined,
                    'path': undefined
                }
            },
            'updateReason': undefined,
            'layerTimes': undefined,
            'layerLabels': undefined,
            'maxX': undefined,
            'maxY': undefined,
            'maxZ': undefined,
            'minX': undefined,
            'minY': undefined,
            'minZ': undefined,
            'depth': undefined,
            'height': undefined,
            'width': undefined,
            'layerProgress': undefined,
            'averageLayerTimes': undefined,
            'fanSpeed': undefined
        };
        this.setupVue();
    }

    setupVue() {
        var slef = this;
        slef.vue = new Vue({
            el: '#app',
            vuetify: new Vuetify({
                theme: {
                    themes: {
                        light: slef.theme,
                        dark: slef.theme,
                    },
                },
            }),
            data: slef.#data,
            watch: {
                'settings.plugins.dashboard.reducedAnimations': function (val) {
                    if (val)
                        $('body').addClass('reducedAnimations');
                    else
                        $('body').removeClass('reducedAnimations');
                },
                'settings.appearance.name': function (val) {
                    if (val != null && val != '')
                        $('title#title').html(`${val} [OctoPrint Dashboard]`);
                    else
                        $('title#title').html('OctoPrint Dashboard');
                },
                settings: { // save settings when settings are changed
                    handler(newVal) {
                        if (slef.tempSettings?.plugins.dashboard.autoSaveSettings || slef.settings.plugins.dashboard.autoSaveSettings) {
                            slef.saveSettings(newVal);
                        }
                    },
                    deep: true
                },
                settingsDialogOpen: function (val) {
                    if (val) {
                        if (this.$vuetify.breakpoint.name == 'xs') {
                            this.settingsTab = null;
                        } else {
                            this.settingsTab = 0;
                        }
                    } else {
                        this.cancel_settings();
                    }
                },
                editingWidget: function (val) {
                    this.is_editingWidget = val !== false;
                },
                is_editingWidget: function (val) {
                    if (val <= 0) {
                        let del = val == -1;
                        let widget = this.editingWidget;
                        this.editingWidget = false;
                        this.editingWidgetIsNew = false;
                        if (del) {
                            this.layout.splice(widget, 1);
                            this.layout.forEach((item, index) => item.i = index);
                        }
                    }
                },
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
                editingWidgetDialogDisallowClose: function () {
                    try {
                        return this.layout[this.editingWidget].title == '' || this.layout[this.editingWidget].type == '';
                    } catch { }
                    return true;
                },
                widgetsArray: function () {
                    return Object.keys(this.widgets).map(
                        (key) => ({
                            value: key,
                            text: this.widgets[key].label,
                        })
                    );
                }
            },
            methods: {
                layoutUpdatedEvent: function () { },
                resizeEvent: function (i, newH, newW, newHPx, newWPx) { },
                layoutCreatedEvent: function (newLayout) {
                    var comp = this.$children[0];
                    var _ = this;
                    window.addEventListener('resize', function () {

                        if (_.lastBreakpoint !== comp.lastBreakpoint) {
                            console.log('resize!');
                        }

                        _.lastBreakpoint = comp.lastBreakpoint;

                    });
                },
                newItem: function () {
                    this.layout.push({ x: 0, y: 0, w: 2, h: 2, i: this.layout.length, title: '', data: [], type: 'widget_text' });
                    this.editingWidget = this.layout.length - 1;
                    this.editingWidgetIsNew = true;
                },
                toggleEdit: function () {
                    this.editing = !this.editing;
                },
                editWidget: function (widget) {
                    this.editingWidget = widget;
                },
                editingWidgetTypeChange: function (value) {
                    if (value != this.layout[this.editingWidget].type) {
                        this.editingWidgetConfirmTypeChange = 1;
                        let unwatch = this.$watch('editingWidgetConfirmTypeChange', function (val) {
                            if (val == 2) {
                                this.layout[this.editingWidget].data = null;
                                this.layout[this.editingWidget].type = '';
                                this.layout[this.editingWidget].type = value;
                            } else {
                                this.layout[this.editingWidget].typeKey = !this.layout[this.editingWidget].typeKey;
                            }
                            unwatch();
                            this.editingWidgetConfirmTypeChange = 0;
                        });
                    }
                },
                reconnect: function () {
                    location.reload();
                },
                navigate: function (widget) {
                    if (widget.navigate != null && this.layouts[widget.navigate] != null && !this.animating) {
                        this.parentLayout.push(this.layoutName);
                        this.layoutName = widget.navigate;
                    }
                },
                navigateBack: function () {
                    if (this.parentLayout.length >= 1 && !this.animating) {
                        this.layoutName = this.parentLayout.pop();
                    }
                },
                save_settings: function () {
                    this.settingsDialogOpen = false;
                    slef.saveSettings(this.settings);
                },
                cancel_settings: function () {
                    if (slef.savingSettings == null && this.updatingSettings == null)
                        slef.settings = JSON.parse(JSON.stringify(slef.tempSettings));
                },
            },
            mounted: function () {
                if (this.settings?.plugins.dashboard.reducedAnimations)
                    $('body').addClass('reducedAnimations');
                OctoPrint.socket.connect();
            },
        });
    }

    saveSettings(newVal) {
        this.savingSettings = true;
        var oldVal = this.tempSettings;
        if (this.updatingSettings == null) {
            var val = {};
            for (var prop in oldVal) {
                if (JSON.stringify(oldVal[prop]) !== JSON.stringify(newVal[prop]))
                    val[prop] = newVal[prop];
            }
            // TODO: handle error
            OctoPrint.settings.save(val).fail(() => { console.log('error'); });
        }
    }

    updateSettings() {
        this.updatingSettings = true;
        OctoPrint.settings.get()
            .done(obj => {
                this.settings = obj;
                this.tempSettings = JSON.parse(JSON.stringify(obj));
                this.updatingSettings = null;
                this.savingSettings = null;
            });
    }

    ready() {
        document.getElementById('loadSplash').style.display = 'none';
        this.#data.showReconnectMessage = false;
    }

    unready() {
        document.getElementById('loadSplash').style.display = 'block';
        setTimeout(() => {
            if (document.getElementById('loadSplash').style.display == 'block')
                this.#data.showReconnectMessage = true;
        }, 3000);
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
    }

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