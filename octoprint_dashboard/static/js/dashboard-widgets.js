class builtin extends DashboardPlugin {
    constructor() {
        super();
    }

    static identifier = 'builtin';

    get_widgets() {

        // __________  TEXT WIDGET __________
        var widgetText = Vue.component('widget-text', {
            data: function () {
                return {}
            },
            props: ['widget', 'data', 'outlined'],
            computed: {
                itemShowProgress: function () {
                    return item => {
                        var showProgress = false;
                        try {
                            item.data.forEach(item => { if (item.showProgress) showProgress = true; });
                        } catch { }
                        return item.data && item.data[0] && showProgress;
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
                itemDataString: function () {
                    return (item, index = 0) => {
                        var val;
                        if (item.data && item.data[index]) {
                            val = item.data[index].item.replace(/(%%[^%]*%%)/gi, (match) => {
                                match.replace(/(?<=%%)(.*)(?=%%)/, (m) => match = m);
                                if (isNumeric(this.data[match]))
                                    this.data[match] = parseFloat(this.data[match]);
                                if (typeof this.data[match] == 'number' && item.data[index].round != null)
                                    return this.data[match].toFixed(item.data[index].round);
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
                itemShowGraph: function () {
                    return item => {
                        var showGraph = false;
                        try {
                            item.data.forEach(item => { if (item.showGraph) showGraph = true; });
                        } catch { }
                        return item.data && item.data[0] && showGraph;
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
            },
            template: `
<div class="mdc-card" :class="{'mdc-card--outlined': outlined}">
    <div v-if="itemShowProgress(widget)" role="progressbar" class="mdc-linear-progress" aria-valuemin="0" aria-valuemax="1">
        <div class="mdc-linear-progress__buffer">
            <div class="mdc-linear-progress__buffer-bar"></div>
        </div>
        <div class="mdc-linear-progress__bar mdc-linear-progress__primary-bar"
            :style="{ transform: 'scaleX(' + widgetProgress(widget) + ')' }">
            <span class="mdc-linear-progress__bar-inner"></span>
        </div>
    </div>
    <div class="wrapper-text">
        <div class="subtitle" v-if="widget.title">{{widget.title}}</div>
        <div class="title" v-if="itemDataString(widget)">{{itemDataString(widget)}}</div>
        <div class="subtitle" style="line-height: 0.25rem;" v-if="itemDataString(widget, 1)">{{itemDataString(widget, 1)}}</div>
    </div>
    <keep-alive>
        <line-chart v-if="itemShowGraph(widget)" class="line-chart" :value="widgetGraph(widget)"></line-chart>
    </keep-alive>
</div>
`
        });

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

        var widgetTextSettings = Vue.component('widget-text-settings', {
            data: function () {
                return {}
            },
            props: ['widget'],
            computed: {
                itemDataRequiringOptionDisabled: function () {
                    return item => {
                        if (item.item.match(/(%%[^%]*%%)/) == null) {
                            item.showGraph = false;
                            item.showProgress = false;
                            return true;
                        }
                        return false;
                    };
                },
            },
            methods: {
                switchRoundValue: function (e, item) {
                    if (e)
                        item.round = 0;
                    else
                        item.round = null;
                },
                widgetAddItem: function () {
                    this.widget.data.push(widgetItemDefaults);
                },
                widgetRemoveItem: function () {
                    this.widget.data.pop();
                }
            },
            template: `
<div>
    <template v-for="(item, index) in widget.data">
        <br>
        <span class="mdc-typography--subheading1">Item {{index}}</span>
        <div style="width: calc(100% - 20px); margin-left: 20px; margin-top: 10px;">
            <data-autocomplete-field v-model="item.item" :label="'Item ' + index + ' value'"></data-autocomplete-field>
            <mdc-switch v-model="item.visible" :disabled="index == 0" label="Visible"></mdc-switch>
            <mdc-switch :value="item.round != null" @change="switchRoundValue($event, item)"
                label="Round number"></mdc-switch>
            <d-collapse :show="item.round != null">
                <mdc-text-field style="width: 100%;" label="Number of decimal places to round" required
                    maxlength="2" v-model="item.round"></mdc-text-field>
            </d-collapse>
            <mdc-switch v-model="item.showProgress" label="Show progress bar"
                :disabled="itemDataRequiringOptionDisabled(item)"></mdc-switch>
            <d-collapse :show="item.showProgress">
                <mdc-text-field style="width: 49%;" label="Progress min" required maxlength="10"
                    v-model="item.progressOptions.min">
                </mdc-text-field>
                <mdc-text-field style="width: 49%;" label="Progress max" required
                    maxlength="10" v-model="item.progressOptions.max">
                </mdc-text-field>
            </d-collapse>
            <mdc-switch v-model="item.showGraph" :disabled="itemDataRequiringOptionDisabled(item)"
                label="Show Graph"></mdc-switch>
        </div>
    </template>
    <br>
    <mdc-button raised @click="widgetAddItem" icon="add">
        Add Item
    </mdc-button>
    <mdc-button :disabled="widget.data.length <= 1" @click="widgetRemoveItem" icon="remove">
        Remove Item
    </mdc-button>
</div>
`
        });

        // __________  IMAGE WIDGET __________

        var widgetImg = Vue.component('widget-img', {
            data: function () {
                return {}
            },
            props: ['widget', 'settings', 'outlined'],
            computed: {
                getImg: function () {
                    return img => {
                        if (img == "webcam")
                            return this.settings && this.settings.webcam && this.settings.webcam.streamUrl;
                        return img;
                    };
                }
            },
            template: `
<div class="mdc-card" :class="{'mdc-card--outlined': outlined}">
    <div v-if="widget.img" class="media"><img :src="getImg(widget.img)"></div>
    <div class="wrapper-text">
        <div class="subtitle" v-if="widget.title">{{widget.title}}</div>
    </div>
</div>
`
        });

        var widgetImgSettings = Vue.component('widget-img-settings', {
            data: function () {
                return {}
            },
            props: ['widget'],
            template: `
<div>
    <br>
    <mdc-text-field style="width: 100%;" label="Image Url" required
        v-model="widget.img">
    </mdc-text-field>
</div>
`
        });


        // __________  GAUGE WIDGET __________

        var widgetGauge = Vue.component('widget-gauge', {
            data: function () {
                return {}
            },
            props: ['widget', 'data', 'outlined'],
            methods: {
                valRaw: function (index) {
                    var val;
                    if (this.widget.data && this.widget.data[index]) {
                        var matches = this.widget.data[index].val.match(/(?<=%%)(.*)(?=%%)/);
                        if (matches != null)
                            val = this.data[matches[0]];
                        else
                            val = false;
                    } else
                        val = false;
                    return val;
                },
            },
            computed: {
                value: function () {
                    return (index) => {
                        if (this.widget.data[index].val != null && this.widget.data[index].val != '') {
                            var val = this.valRaw(index) != false ? this.valRaw(index) : this.widget.data[index].val;
                            return (val - this.widget.data[index].min) / (this.widget.data[index].max - this.widget.data[index].min) * 100;
                        } else {
                            return 0;
                        }
                    }
                }
            },
            beforeMount: function () {
                if (this.widget.data == null || this.widget.data.length == 0) {
                    var v = function () { return { min: 0, max: 100 }; };
                    this.widget.data = [v(), v()];
                }
            },
            template: `
        <div class="mdc-card" :class="{'mdc-card--outlined': outlined}">
            <d-gauge :type="widget.gaugeType" :value1="value(0)" :value2="value(1)"></d-gauge>
            <div class="wrapper-text" style="padding: 4px 16px 4px 16px;">
                <div class="subtitle" v-if="widget.title">{{widget.title}}</div>
            </div>
        </div>
        `
        });

        var widgetGaugeSettings = Vue.component('widget-gauge-settings', {
            data: function () {
                return {}
            },
            props: ['widget'],
            template: `
        <div>
            <br>
            <mdc-text-field style="width: 100%;" label="Gauge type" required
                v-model="widget.gaugeType" type="number" min="1" max="4">
            </mdc-text-field>
            <br><br>
            <span class="mdc-typography--subheading1">Value 1</span>
            <br>
            <data-autocomplete-field style="width: 100%;" label="Value" required
                v-model="widget.data[0].val">
            </data-autocomplete-field>
            <br>
            <mdc-text-field style="width: 49%;" label="Min" required maxlength="10"
                v-model="widget.data[0].min">
            </mdc-text-field>
            <mdc-text-field style="width: 49%; float: right" label="Max" required
                maxlength="10" v-model="widget.data[0].max">
            </mdc-text-field>
            <br><br>
            <span class="mdc-typography--subheading1">Value 2</span>
            <br>
            <data-autocomplete-field style="width: 100%;" label="Value"
                v-model="widget.data[1].val">
            </data-autocomplete-field>
            <br>
            <mdc-text-field style="width: 49%;" label="Min" required maxlength="10"
                v-model="widget.data[1].min">
            </mdc-text-field>
            <mdc-text-field style="width: 49%; float: right;" label="Max" required
                maxlength="10" v-model="widget.data[1].max">
            </mdc-text-field>
        </div>
        `
        });

        // __________

        return [
            {
                value: 'text',
                label: 'Default',
                component: widgetText,
                settings: widgetTextSettings
            },
            {
                value: 'img',
                label: 'Image / Webcam',
                component: widgetImg,
                settings: widgetImgSettings
            },
            {
                value: 'gauge',
                label: 'Gauge',
                component: widgetGauge,
                settings: widgetGaugeSettings
            }
        ];
    }
}

Dashboard.RegisterPlugin(builtin);