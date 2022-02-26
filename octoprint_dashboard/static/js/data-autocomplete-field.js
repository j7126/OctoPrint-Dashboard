var possibleDataPoints = {
    search: function (str) {
        var result = [];
        Object.keys(this.data).forEach(key => {
            if (key.toLowerCase().startsWith(str.toLowerCase()))
                result.push({
                    name: key,
                    description: this.data[key] != null ? this.data[key] : ''
                });
        });
        Object.keys(this.data).forEach(key => {
            if (key.toLowerCase().includes(str.toLowerCase()) && !key.toLowerCase().startsWith(str.toLowerCase()))
                result.push({
                    name: key,
                    description: this.data[key] != null ? this.data[key] : ''
                });
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
        };
    },
    props: ['value', 'label'],
    watch: {
        showing: function (val) {
            if (val) {
                this.selected = null;
                this.menu.root.className = 'mdc-menu mdc-menu-surface mdc-menu-surface--open mdc-menu-surface--is-open-below';
            }
            else
                this.menu.root.className = 'mdc-menu mdc-menu-surface';
        },
        items: function (val) {
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
                if (event.key == 'Enter') {
                    event.preventDefault();
                    if (this.selected == null)
                        this.select(this.items[0].name);
                    else
                        this.select(this.items[this.selected].name);
                }
                if (event.key == 'ArrowUp' || event.key == 'ArrowDown') {
                    event.preventDefault();
                    if (this.selected == null)
                        this.selected = 0;
                    else if (event.key == 'ArrowUp')
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
        MDCTextField = window.mdc.textField.MDCTextField;
        new MDCTextField(document.querySelector('#data-autocomplete-field-f_' + this._uid));
    },
    template: `
<div>
    <label :id="'data-autocomplete-field-f_' + _uid" class="mdc-text-field mdc-text-field--filled" style="width: 100%;">
        <span class="mdc-text-field__ripple"></span>
        <span class="mdc-floating-label" :id="'data-autocomplete-field-input-label_' + _uid">{{label}}</span>
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
});

Vue.component('d-gauge', {
    data: function () {
        return {};
    },
    props: ['type', 'value1', 'value2'],
    computed: {
        value1Style: function () {
            if (this.value1 == null)
                return {};
            if (this.type == 1)
                return { 'stroke-dashoffset': 120 - (this.value1 * 120 / 100) };
            else
                return { 'stroke-dashoffset': 120 - (this.value1 * 120 / 100) };
        },
        value2Style: function () {
            var value2 = this.value2;
            if (this.value2 == null)
                value2 = this.value1;
            if (value2 == null)
                return {};
            if (this.type == 3) {
                return { 'stroke-dashoffset': 170 - ((this.value2 == null ? 0 : value2) * 170 / 100) };
            } else if (this.type == 4) {
                return { 'transform': 'rotate(' + (-90 + value2 / 100 * 180) + 'deg)' };
            } else {
                return { 'stroke-dashoffset': 120 - (value2 * 120 / 100) };
            }
        }
    },
    template: `
<svg width="124" height="66" v-if="type == 3">
    <g fill-opacity="0" stroke-width="16">
        <path d="M24 66a38 38 0 1 1 76 0" stroke="#EBEDF8" />
        <path d="M8 66a54 54 0 1 1 108 0" stroke="#BC9FE6" stroke-dasharray="170" stroke-dashoffset="170" style="transition: stroke-dashoffset 1s;" :style="value2Style" />
        <path d="M24 66a38 38 0 1 1 76 0" stroke="#6200ee" stroke-dasharray="120" stroke-dashoffset="120" style="transition: stroke-dashoffset 1s;" :style="value1Style" />
    </g>
</svg>
<svg width="100" height="50" v-else-if="type == 4">
    <g fill-opacity="0" stroke-width="16">
        <path d="M12 50a38 38 0 1 1 76 0" stroke="#EBEDF8" />
        <path d="M12 50a38 38 0 1 1 76 0" stroke="#85c6c6" stroke-dasharray="120" stroke-dashoffset="120" style="transition: stroke-dashoffset 1s;" :style="value1Style" />
        <circle r="1.5" cx="50" cy="48.5" fill="#000000" fill-opacity="1" stroke-width="0" />
        <path d="M 48.5,48.5 50,25 51.5,48.5 Z" fill="#000000" fill-opacity="1" stroke-width="0" style="transform: rotate(-90deg); transition: transform 1s; transform-origin: 50% 97%;" :style="value2Style" />
    </g>
</svg>
<svg width="108" height="50" v-else>
    <g fill-opacity="0" stroke-width="16">
        <path d="M16 50a38 38 0 1 1 76 0" stroke="#EBEDF8" />
        <path d="M16 50a38 38 0 1 1 76 0" stroke="#BC9FE6" stroke-dasharray="120" stroke-dashoffset="120" style="transition: stroke-dashoffset 1s;" :style="value2Style" />
        <path d="M16 50a38 38 0 1 1 76 0" stroke="#6200ee" stroke-dasharray="120" stroke-dashoffset="120" style="transition: stroke-dashoffset 1s;" :style="value1Style" />
    </g>
</svg>
`
});

Vue.component('d-collapse', {
    data: function () {
        return {};
    },
    props: ['show'],
    template: `
<transition name="collapse">
    <div v-if="show">
        <slot></slot>
    </div>
</transition>
`
});