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
                    };
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
            <br>
            <mdc-text-field style="width: 100%;" label="Gauge type" required
                v-model="widget.gaugeType" type="number" min="1" max="4">
            </mdc-text-field>
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
        };
    }
}