Vue.component('line-chart', {
    extends: VueChartJs.Line,
    data: function () {
        return {
            data: [0],
            labels: ['']
        };
    },
    props: ['value'],
    watch: {
        value: function (val) {
            var self = this;
            var d = function () {
                self.data.push(val);
                if (self.data.length > 50) {
                    self.data.splice(0, 1);
                } else
                    self.labels.push('');
                self.$data._chart.update()
            };
            d();
            var interval = null;
            interval = setInterval(() => {
                setTimeout(() => {
                    if (self.data[self.data.length - 1] == val) {
                        d();
                    } else {
                        clearInterval(interval);
                    }
                }, 100);
            }, 3000);
        }
    },
    mounted() {
        this.renderChart({
            labels: this.labels,
            datasets: [
                {
                    label: '',
                    borderColor: '#01878670',
                    backgroundColor: '#cbe7e670',
                    pointBackgroundColor: '#ffffff00',
                    pointBorderColor: '#ffffff00',
                    data: this.data
                }
            ]
        }, {
            responsive: true,
            maintainAspectRatio: false,
            legend: {
                display: false
            },
            scales: {
                yAxes: [{
                    display: false,
                    gridLines: {
                        display: false
                    }
                }],
                xAxes: [{
                    display: false,
                    gridLines: {
                        display: false
                    }
                }]
            }
        })
    }
});

var possibleDataPoints = {
    search: function (str) {
        var result = [];
        Object.keys(this.data).forEach(key => {
            if (key.toLowerCase().startsWith(str.toLowerCase()))
                result.push({
                    name: key,
                    description: this.data[key] != null ? this.data[key] : ''
                })
        });
        Object.keys(this.data).forEach(key => {
            if (key.toLowerCase().includes(str.toLowerCase()) && !key.toLowerCase().startsWith(str.toLowerCase()))
                result.push({
                    name: key,
                    description: this.data[key] != null ? this.data[key] : ''
                })
        });
        return result;
    },
    data: {}
};

Vue.component('data-autocomplete-field', {
    data: function () {
        return {
            items: [],
            menu: null,
            selected: null,
            showing: false,
        }
    },
    props: ['value', 'index'],
    watch: {
        showing: function (val, oldval) {
            if (val) {
                this.selected = null;
                this.menu.root.className = "mdc-menu mdc-menu-surface mdc-menu-surface--open mdc-menu-surface--is-open-below";
            }
            else
                this.menu.root.className = "mdc-menu mdc-menu-surface";
        },
        items: function (val, oldval) {
            this.selected = null;
            if (val.length > 0)
                this.showing = true;
            else
                this.showing = false;
        }
    },
    methods: {
        textChange: function (event) {
            this.$emit('input', event.target.value);
            var m = event.target.value.match(/(?<=^[^%]*((%%)[^%]*(%%)[^%]*)*(%%)[^%]*)(?<=%%)[^%]*$/s);
            if (m == null || m[0] == null) {
                this.items = [];
                return;
            }
            var t = m[0];
            this.items = possibleDataPoints.search(t);
        },
        keyDown: function (event) {
            if (this.showing) {
                if (event.key == "Enter") {
                    event.preventDefault();
                    if (this.selected == null)
                        this.select(this.items[0].name);
                    else
                        this.select(this.items[this.selected].name);
                }
                if (event.key == "ArrowUp" || event.key == "ArrowDown") {
                    event.preventDefault();
                    if (this.selected == null)
                        this.selected = 0;
                    else if (event.key == "ArrowUp")
                        this.selected = this.selected == 0 ? this.items.length - 1 : this.selected - 1;
                    else
                        this.selected = this.selected >= this.items.length - 1 ? 0 : this.selected + 1;
                }
            }
        },
        focusout: function (event) {
            if (event.relatedTarget == null || (event.relatedTarget != null && !event.relatedTarget.className.includes('mdc-list-item')))
                this.showing = false;
        },
        select: function (name) {
            this.$emit('input', this.value.replace(/(?<=^[^%]*((%%)[^%]*(%%)[^%]*)*(%%)[^%]*)(?<=%%)[^%]*$/s, name + '%%'));
            this.items = [];
        }
    },
    mounted: function () {
        MDCMenu = window.mdc.menu.MDCMenu;
        this.menu = new MDCMenu(document.querySelector('#data-autocomplete-field_' + this._uid + ' .mdc-menu'));
        this.menu.open = false;
    },
    template: `
<div>
    <label class="mdc-text-field mdc-text-field--filled" data-mdc-auto-init="MDCTextField" style="width: 100%;">
        <span class="mdc-text-field__ripple"></span>
        <span class="mdc-floating-label" :id="'data-autocomplete-field-input-label_' + _uid">Item {{index}} value</span>
        <input class="mdc-text-field__input" type="text" :aria-labelledby="'data-autocomplete-field-input-label_' + _uid" :value="value" required maxlength="100" @input="textChange" @focusout="focusout" @focus="textChange" @keydown="keyDown">
        <span class="mdc-line-ripple"></span>
    </label>
    <div class="data-autocomplete-field" :id="'data-autocomplete-field_' + _uid">
        <div class="mdc-menu mdc-menu-surface mdc-menu-surface--open mdc-menu-surface--is-open-below" style="transform-origin: left top; left: 0px; top: 0px; max-height: 578px;">
            <ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical" tabindex="-1">
                <li v-for="(item, index) in items" class="mdc-list-item" role="menuitem" tabindex="-1" @click="select(item.name)" :class="{ 'mdc-list-item--selected': selected == index }">
                    <span class="mdc-list-item__ripple"></span>
                    <span class="mdc-list-item__text"><strong>{{item.name}}</strong>{{item.description != '' ? ': ' + item.description : ''}}</span>
                </li>
            </ul>
        </div>
    </div>
</div>`
})