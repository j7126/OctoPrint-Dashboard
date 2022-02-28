'use strict';

export default class widget_text extends DashboardWidget {
    constructor() {
        super();
    }

    label = 'Basic';

    isNumeric(str) {
        if (typeof str != 'string') return false;
        return !isNaN(str) && !isNaN(parseFloat(str));
    }

    build_widget() {
        let _self = this;
        return {
            data: function () {
                return {};
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
                widgetProgress: function () {
                    return widget => {
                        var progress = null;
                        widget.data.forEach((item, index) => {
                            if (progress == null && item.showProgress)
                                progress = (this.itemDataRaw(widget, index) - item.progressOptions.min) / item.progressOptions.max;
                        });
                        if (progress == null)
                            progress = 0;
                        return progress;
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
                    _
                    return widget => {
                        var progress = null;
                        widget.data.forEach((item, index) => {
                            if (progress == null && item.showGraph)
                                progress = this.itemDataRaw(widget, index);
                        });
                        if (progress == null)
                            progress = 0;
                        return progress;
                    };
                },
                itemDataString: function () {
                    var index = 0;
                    var self = this;
                    try {
                        var val;
                        if (self.widget.data && self.widget.data[index]) {
                            val = self.widget.data[index].item.replace(/(%%[^%]*%%)/gi, (match) => {
                                match.replace(/(?<=%%)(.*)(?=%%)/, (m) => match = m);
                                match = match.split('.');
                                var _data = self.data[match.shift()];
                                match.forEach(m => {
                                    if (_self.isNumeric(m))
                                        m = parseInt(m);
                                    if (_data == null)
                                        _data = 'null';
                                    if (_data != 'null')
                                        _data = _data[m];
                                });
                                if (typeof _data !== 'number' && _self.isNumeric(_data))
                                    _data = parseFloat(_data);
                                else if (typeof _data != 'string' && typeof _data != 'number')
                                    _data = 'null';
                                if (typeof _data == 'number' && self.widget.data[index].round != null)
                                    return _data.toFixed(self.widget.data[index].round);
                                return _data;
                            });
                        } else
                            val = false;
                        if (typeof val == 'string' && val.includes('null')) {
                            val = val.replaceAll('null', '-');
                        }
                        return val;
                    }
                    catch (err) {
                        console.log(err);
                        return '-';
                    }
                },
            },
            methods: {
                itemDataRaw: function (item, index = 0) {
                    try {
                        var val;
                        if (item.data && item.data[index]) {
                            var matches = item.data[index].item.match(/(?<=%%)(.*)(?=%%)/);
                            if (matches != null) {
                                var match = matches[0].split('.');
                                val = this.data[match.shift()];
                                match.forEach(m => {
                                    if (val != false && val != null)
                                        val = val[m];
                                    else
                                        val = false;
                                });
                            } else
                                val = false;
                        } else
                            val = false;
                        return val;
                    }
                    catch (err) {
                        console.log(err);
                        return false;
                    }
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
        <div class="title" v-if="itemDataString">{{itemDataString}}</div>
        <div class="subtitle" style="line-height: 0.25rem;" v-if="false">{{itemDataString(1)}}</div>
        </div>
        <keep-alive>
        <line-chart v-if="itemShowGraph(widget)" class="line-chart" :value="widgetGraph(widget)"></line-chart>
        </keep-alive>
        </div>
        `
        };
    }

    build_settings() {
        var widgetItemDefaults = {
            item: '',
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

        return {
            data: function () {
                return {};
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
            beforeMount: function () {
                if (this.widget.data == null)
                    this.widget.data = [];
            },
            template: `
<div>
    <template v-for="(item, index) in widget.data">
        <br>
        <mdc-subheading>Item {{index}}</mdc-subheading>
        <mdc-indent-block>
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
        </mdc-indent-block>
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
        };
    }
}