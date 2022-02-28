'use strict';

export default class DashboardWidget {
    constructor() {
        this.component = Vue.component(
            this.constructor.name,
            this.build_widget()
        );
        this.settings = Vue.component(
            this.constructor.name + '_settings',
            this.build_settings()
        );
    }

    label = 'Empty Widget';

    build_widget() {
        return {
            data: function () {
                return {};
            },
            template: `
            <div class="mdc-card" :class="{'mdc-card--outlined': outlined}">
                Empty Dashboard Widget
            </div>
            `
        };
    }

    build_settings() {
        return {
            data: function () {
                return {};
            },
            template: '<div></div>'
        };
    }
}