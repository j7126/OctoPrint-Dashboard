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
            props: ['widget', 'data'],
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
                        return progress * 100;
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
<div class="wrapper">
    <v-progress-linear :value="widgetProgress(widget)" v-if="itemShowProgress(widget)" color="primary" background-color="#e6e6e6"></v-progress-linear>
    <div class="small" v-if="widget.title">{{widget.title}}</div>
    <div class="large" v-if="itemDataString">{{itemDataString}}</div>
    <div class="small" style="line-height: 0.25rem;" v-if="false">{{itemDataString(1)}}</div>
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
        <span class="text-subheading-1">Item {{index}}</span>
        <indent-block>
            <data-autocomplete-field v-model="item.item" :label="'Item ' + index + ' value'"></data-autocomplete-field>
            <v-switch hide-details="auto" v-model="item.visible" :disabled="index == 0" label="Visible"></v-switch>
            <v-switch hide-details="auto" v-model="item.round != null" @change="switchRoundValue($event, item)" label="Round number"></v-switch>
            <template v-if="item.round != null">
                <space></space>
                <v-text-field hide-details="auto" filled label="Number of decimal places to round *" v-model="item.round" type="number" min="0" max="10" :rules="$root.requiredRule"></v-text-field>
            </template>
            <v-switch hide-details="auto" v-model="item.showProgress" label="Show progress bar" :disabled="itemDataRequiringOptionDisabled(item)"></v-switch>
            <template v-if="item.showProgress">
                <space></space>
                <v-container style="padding: 0;">
                    <v-row>
                        <v-col cols="12" sm="6">
                            <v-text-field hide-details="auto" filled v-model="item.progressOptions.min" label="Progress min *" :rules="$root.requiredRule" type="number"></v-text-field>
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-text-field hide-details="auto" filled v-model="item.progressOptions.max" label="Progress max *" :rules="$root.requiredRule" type="number"></v-text-field>
                        </v-col>
                    </v-row>
                </v-container>
            </template>
            <v-switch hide-details="auto" v-model="item.showGraph" :disabled="itemDataRequiringOptionDisabled(item)" label="Show Graph"></v-switch>
        </indent-block>
    </template>
    <br>
    <v-btn color="primary" outlined @click="widgetAddItem">
        <v-icon left>
            add
        </v-icon>
        Add Item
    </v-btn>
    <v-btn color="error" outlined @click="widgetRemoveItem" :disabled="widget.data.length <= 1">
        <v-icon left>
            remove
        </v-icon>
        Remove Item
    </v-btn>
</div>
`
        };
    }
}