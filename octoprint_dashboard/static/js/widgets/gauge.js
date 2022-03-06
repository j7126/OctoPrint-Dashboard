'use strict';

export default class widget_gauge extends DashboardWidget {
    constructor() {
        super();
    }

    label = 'Gauge';

    build_widget() {
        return {
            data: function () {
                return {};
            },
            props: ['widget', 'data'],
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
                    };
                }
            },
            beforeMount: function () {
                if (this.widget.data == null) {
                    this.widget.data = {
                        0: { min: 0, max: 100, val: '' },
                        1: { min: 0, max: 100, val: '' },
                        gaugeType: 1
                    };
                }
            },
            template: `
<div class="wrapper" style="padding: 4px 16px 4px 16px;">
    <div class="small" v-if="widget.title">{{widget.title}}</div>
    <d-gauge :type="widget.data.gaugeType" :value1="value(0)" :value2="value(1)"></d-gauge>
</div>
        `
        };
    }

    build_settings() {
        return {
            data: function () {
                return {};
            },
            props: ['widget'],
            template: `
<div>
    <v-select hide-details="auto" :items="[1, 3, 4]" filled v-model="widget.data.gaugeType" label="Gauge type"></v-select>
    <space></space>
    <span class="text-subtitle-1">Value 1</span>
    <data-autocomplete-field style="width: 100%;" label="Value" required v-model="widget.data[0].val"></data-autocomplete-field>
    <space></space>
    <v-container style="padding: 0;">
        <v-row>
            <v-col cols="12" sm="6">
                <v-text-field hide-details="auto" filled v-model="widget.data[0].min" label="Min *" :rules="$root.requiredRule" type="number"></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
                <v-text-field hide-details="auto" filled v-model="widget.data[0].max" label="Max *" :rules="$root.requiredRule" type="number"></v-text-field>
            </v-col>
        </v-row>
    </v-container>
    <space></space>
    <span class="text-subtitle-1">Value 2</span>
    <data-autocomplete-field style="width: 100%;" label="Value" v-model="widget.data[1].val"></data-autocomplete-field>
    <space></space>
    <v-container style="padding: 0;">
        <v-row>
            <v-col cols="12" sm="6">
                <v-text-field hide-details="auto" filled v-model="widget.data[1].min" label="Min *" :rules="$root.requiredRule" type="number"></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
                <v-text-field hide-details="auto" filled v-model="widget.data[1].max" label="Max *" :rules="$root.requiredRule" type="number"></v-text-field>
            </v-col>
        </v-row>
    </v-container>
</div>
        `
        };
    }
}