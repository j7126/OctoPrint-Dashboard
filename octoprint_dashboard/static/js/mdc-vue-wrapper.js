/*
 * mdc-vue-wrapper: v0.2.0
 * https://github.com/j7126/mdc-vue-wrapper
 * A basic wrapper to use material components with vuejs
 * Copyright (c) 2020 - 2021 Jefferey Neuffer (github.com/j7126)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// we can support importing modules or using the cdn
if (typeof Vue === 'undefined')
    Vue = require('vue');
if (window.mdc == null) {
    MDCTopAppBar = require('@material/top-app-bar').MDCTopAppBar;
    MDCRipple = require('@material/ripple').MDCRipple;
    MDCSwitch = require('@material/switch').MDCSwitch;
    MDCCheckbox = require('@material/checkbox').MDCCheckbox;
    MDCFormField = require('@material/form-field').MDCFormField;
    MDCTextField = require('@material/textfield').MDCTextField;
    MDCSelect = require('@material/select').MDCSelect;
    MDCDialog = require('@material/dialog').MDCDialog;
}

// Top app bar
Vue.component('mdc-top-app-bar', {
    data: function () {
        return {}
    },
    props: ['title'],
    mounted: function () {
        if (window.mdc != null)
            MDCTopAppBar = window.mdc.topAppBar.MDCTopAppBar;
        const topAppBar = new MDCTopAppBar(this.$el);
        for (var i = 0; i < this.$slots.end.length; i++) {
            try {
                if (this.$slots.end[i].componentOptions.tag == 'mdc-icon-button') {
                    this.$slots.end[i].componentInstance.inTopAppBar = true;
                }
            }
            catch { }
        }
    },
    template: `
<header class="mdc-top-app-bar">
    <div class="mdc-top-app-bar__row">
        <section class="mdc-top-app-bar__section mdc-top-app-bar__section--align-start">
            <span class="mdc-top-app-bar__title">{{title}}</span>
        </section>
        <section class="mdc-top-app-bar__section mdc-top-app-bar__section--align-end" role="toolbar">
            <slot name="end"></slot>
        </section>
    </div>
</header>
`
});

// Buttons
Vue.component('mdc-fab', {
    props: ['icon', 'label'],
    mounted: function () {
        if (window.mdc != null)
            MDCRipple = window.mdc.ripple.MDCRipple;
        const ripple = new MDCRipple(this.$el);
    },
    template: `
<button class="mdc-fab" :aria-label="label != null ? label : icon" @click="$emit('click')">
    <div class="mdc-fab__ripple"></div>
    <span class="mdc-fab__icon material-icons">{{icon}}</span>
</button>
`
});

Vue.component('mdc-icon-button', {
    data: function () {
        return {
            inTopAppBar: false
        }
    },
    props: ['icon'],
    mounted: function () {
        if (window.mdc != null)
            MDCRipple = window.mdc.ripple.MDCRipple;
        const iconButtonRipple = new MDCRipple(this.$el);
        iconButtonRipple.unbounded = true;
    },
    template: `<button class="mdc-icon-button material-icons" :class="{'mdc-top-app-bar__action-item': inTopAppBar}" @click="$emit('click')"><div class="mdc-icon-button__ripple"></div>{{icon}}</button>`
});

Vue.component('mdc-button', {
    data: function () {
        return {
            inDialog: false
        }
    },
    props: ['outlined', 'raised', 'unelevated', 'icon', 'disabled'],
    mounted: function () {
        if (window.mdc != null)
            MDCRipple = window.mdc.ripple.MDCRipple;
        const buttonRipple = new MDCRipple(this.$el);
    },
    template: `
<button class="mdc-button" :class="{'mdc-dialog__button': inDialog, 'mdc-button--outlined': outlined, 'mdc-button--raised': raised, 'mdc-button--unelevated': unelevated}" @click="$emit('click')" :disabled="disabled">
    <div class="mdc-button__ripple"></div>
    <i v-if="icon != null" class="material-icons mdc-button__icon" aria-hidden="true">{{icon}}</i>
    <span class="mdc-button__label"><slot></slot></span>
</button>
`
});

// Inputs
Vue.component('mdc-switch', {
    data: function () {
        return {
            switchControl: null
        }
    },
    props: ['value', 'label', 'disabled'],
    mounted: function () {
        if (window.mdc != null)
            MDCSwitch = window.mdc.switchControl.MDCSwitch;
        this.switchControl = new MDCSwitch(this.$el.childNodes[0]);
    },
    template: `
<div style="margin: 20px 0px;">
    <div class="mdc-switch" :class="{'mdc-switch--checked': value, 'mdc-switch--disabled': disabled}" style="margin-right:20px;">
        <div class="mdc-switch__track"></div>
        <div class="mdc-switch__thumb-underlay">
            <div class="mdc-switch__thumb"></div>
            <input type="checkbox" :id="'switch' + _uid" class="mdc-switch__native-control" role="switch" :aria-checked="value" :checked="value" @change="$emit('input', $event.target.checked); $emit('change', $event.target.checked)" :disabled="disabled">
        </div>
    </div>
    <label v-if="label != null" :for="'switch' + _uid">{{label}}</label>
</div>
`
});

Vue.component('mdc-checkbox', {
    props: ['value', 'label', 'disabled'],
    mounted: function () {
        if (window.mdc != null)
            MDCCheckbox = window.mdc.checkbox.MDCCheckbox;
        if (window.mdc != null)
            MDCFormField = window.mdc.formField.MDCFormField;
        const checkbox = new MDCCheckbox(this.$el.childNodes[0]);
        const formField = new MDCFormField(this.$el);
        formField.input = checkbox;
    },
    template: `
<div class="mdc-form-field">
    <div class="mdc-checkbox">
        <input :checked="value" type="checkbox" class="mdc-checkbox__native-control" :id="'mdc-checkbox_' + _uid" :disabled="disabled" @change="$emit('input', $event.target.checked); $emit('change', $event.target.checked)" />
        <div class="mdc-checkbox__background">
            <svg class="mdc-checkbox__checkmark" viewBox="0 0 24 24">
                <path class="mdc-checkbox__checkmark-path" fill="none" d="M1.73,12.91 8.1,19.28 22.79,4.59" />
            </svg>
            <div class="mdc-checkbox__mixedmark"></div>
        </div>
        <div class="mdc-checkbox__ripple"></div>
    </div>
    <label :for="'mdc-checkbox_' + _uid" v-html="label"></label>
</div>
`
});

Vue.component('mdc-text-field', {
    data: function () {
        return {}
    },
    props: ['value', 'label', 'disabled', 'required', 'maxlength', 'type', 'min', 'max', 'outlined'],
    mounted: function () {
        if (window.mdc != null)
            MDCTextField = window.mdc.textField.MDCTextField;
        const switchControl = new MDCTextField(this.$el);
    },
    template: `
<label :id="'mdc-text-field-l_' + _uid" class="mdc-text-field"
    :class="{'mdc-text-field--filled': !outlined, 'mdc-text-field--outlined': outlined}">
    <span v-if="!outlined" class="mdc-text-field__ripple"></span>
    <span v-if="outlined" class="mdc-notched-outline">
        <span class="mdc-notched-outline__leading"></span>
        <span class="mdc-notched-outline__notch">
            <span class="mdc-floating-label" :id="'mdc-text-field_' + _uid">{{label}}</span>
        </span>
        <span class="mdc-notched-outline__trailing"></span>
    </span>
    <span v-if="!outlined" class="mdc-floating-label" :id="'mdc-text-field_' + _uid">{{label}}</span>
    <input class="mdc-text-field__input" :type="type != null ? type : 'text'"
        :aria-labelledby="'mdc-text-field_' + _uid" @input="$emit('input', $event.target.value)" :required="required"
        :disabled="disabled" :maxlength="maxlength" :value="value" :min="min" :max="max">
    <span v-if="!outlined" class="mdc-line-ripple"></span>
</label>
`
});

Vue.component('mdc-select', {
    data: function () {
        return {}
    },
    props: ['value', 'label', 'disabled', 'required'],
    mounted: function () {
        var selected = this.$el.querySelector('.mdc-select__menu.mdc-menu.mdc-menu-surface > ul > li.mdc-list-item--selected');
        if (selected.getAttribute('data-value') != this.value) {
            var el = this.$el.querySelector('.mdc-select__menu.mdc-menu.mdc-menu-surface > ul > li[data-value="' + this.value + '"]');
            if (el != null) {
                selected.classList.remove('mdc-list-item--selected');
                el.classList.add('mdc-list-item--selected');
                selected.setAttribute('aria-selected', 'false');
                el.setAttribute('aria-selected', 'true');
            }
        }
        if (window.mdc != null)
            MDCSelect = window.mdc.select.MDCSelect;
        const select = new MDCSelect(this.$el);
        select.listen('MDCSelect:change', () => {
            this.$emit('input', select.value);
        });
    },
    template: `
<div class="mdc-select mdc-select--filled demo-width-class">
    <div class="mdc-select__anchor" role="button" aria-haspopup="listbox" aria-expanded="false"
        aria-labelledby="demo-label demo-selected-text">
        <span class="mdc-select__ripple"></span>
        <span id="demo-label" class="mdc-floating-label">{{label}}</span>
        <span class="mdc-select__selected-text-container">
            <span id="demo-selected-text" class="mdc-select__selected-text"></span>
        </span>
        <span class="mdc-select__dropdown-icon" style="right: 0; position: absolute;">
            <svg class="mdc-select__dropdown-icon-graphic" viewBox="7 10 10 5" focusable="false">
                <polygon class="mdc-select__dropdown-icon-inactive" stroke="none" fill-rule="evenodd"
                    points="7 10 12 15 17 10">
                </polygon>
                <polygon class="mdc-select__dropdown-icon-active" stroke="none" fill-rule="evenodd"
                    points="7 15 12 10 17 15">
                </polygon>
            </svg>
        </span>
        <span class="mdc-line-ripple"></span>
    </div>

    <div class="mdc-select__menu mdc-menu mdc-menu-surface mdc-menu-surface--fullwidth">
        <ul class="mdc-list" role="listbox" aria-label="Food picker listbox">
            <li class="mdc-list-item mdc-list-item--selected" aria-selected="true" data-value="" role="option">
                <span class="mdc-list-item__ripple"></span>
            </li>
            <slot></slot>
        </ul>
    </div>
</div>
`
});

Vue.component('mdc-select-option', {
    data: function () {
        return {}
    },
    props: ['value', 'label', 'disabled'],
    template: `
<li class="mdc-list-item" aria-selected="false" :data-value="value" role="option">
    <span class="mdc-list-item__ripple"></span>
    <span class="mdc-list-item__text">
        {{label}}
    </span>
</li>
`
});

// Dialog
Vue.component('mdc-dialog', {
    data: function () {
        return {
            dialog: null
        }
    },
    props: ['value', 'open', 'title', 'escapeKeyAction', 'scrimClickAction'],
    watch: {
        value: function (val) {
            if (val)
                this.dialog.open();
        },
        open: function (val) {
            if (val)
                this.dialog.open();
        },
        escapeKeyAction: function (val) {
            this.dialog.escapeKeyAction = val;
        },
        scrimClickAction: function (val) {
            this.dialog.scrimClickAction = val;
        }
    },
    mounted: function () {
        var self = this;
        if (window.mdc != null)
            MDCDialog = window.mdc.dialog.MDCDialog;
        this.dialog = new MDCDialog(this.$el);
        this.dialog.escapeKeyAction = this.escapeKeyAction;
        this.dialog.scrimClickAction = this.scrimClickAction;
        this.dialog.listen('MDCDialog:closed', e => {
            this.$emit('input', false);
            this.$emit('closed', e.detail);
        });
        this.dialog.listen('MDCDialog:opened', e => {
            const switchElems = document.querySelectorAll('#mdc-dialog_' + this._uid + ' .mdc-switch');
            for (i = 0; i < switchElems.length; ++i) {
                if (switchElems[i] != null) { mdc.switchControl.MDCSwitch.attachTo(switchElems[i]).layout; }
            }
        });
        for (var i = 0; i < this.$slots.actions.length; i++) {
            try {
                if (this.$slots.actions[i].componentOptions.tag == 'mdc-button') {
                    this.$slots.actions[i].componentInstance.inDialog = true;
                }
            }
            catch { }
        }
    },
    template: `
<div class="mdc-dialog" :id="'mdc-dialog_' + _uid">
    <div class="mdc-dialog__container">
        <div class="mdc-dialog__surface" role="alertdialog" aria-modal="true" :aria-labelledby="'dialog' + _uid + '-title'"
            aria-describedby="'dialog' + _uid + '-content'">
            <slot name="header" />
            <span class="mdc-typography--headline5 mdc-dialog__title" v-if="title != null" :id="'dialog' + _uid + '-title'">
                {{title}}
            </span>
            <div class="mdc-dialog__content" :id="'dialog' + _uid + '-content'">
                <slot></slot>
            </div>
            <div class="mdc-dialog__actions">
                <slot name="actions"></slot>
            </div>
        </div>
    </div>
    <div class="mdc-dialog__scrim"></div>
</div>
`
});

// Card
Vue.component('mdc-card', {
    template: `
<div class="mdc-card">
    <slot></slot>
</div>
`
});

// Typography
for (var i = 1; i <= 6; i++) {
    Vue.component(`mdc-h${i}`, {
        template: `
    <h${i} class="mdc-typography--headline${i}">
        <slot></slot>
    </h${i}>
    `
    });
}

for (var i = 1; i <= 2; i++) {
    Vue.component(`mdc-subtitle${i}`, {
        template: `
    <h6 class="mdc-typography--subtitle${i}">
        <slot></slot>
    </h6>
    `
    });
    Vue.component(`mdc-body${i}`, {
        template: `
    <p class="mdc-typography--body${i}">
        <slot></slot>
    </p>
    `
    });
}

Vue.component('mdc-overline', {
    template: `
<span class="mdc-typography--overline">
    <slot></slot>
</span>
`
});

Vue.component('mdc-caption', {
    template: `
<span class="mdc-typography--caption">
    <slot></slot>
</span>
`
});
