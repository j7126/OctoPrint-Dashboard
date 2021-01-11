Vue.component('mdc-top-app-bar', {
    data: function () {
        return {}
    },
    props: ['title'],
    mounted: function () {
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

Vue.component('mdc-icon-button', {
    data: function () {
        return {
            inTopAppBar: false
        }
    },
    props: ['icon'],
    mounted: function () {
        MDCRipple = window.mdc.ripple.MDCRipple;
        const iconButtonRipple = new MDCRipple(this.$el);
        iconButtonRipple.unbounded = true;
    },
    template: `<button class="mdc-icon-button material-icons" :class="{'mdc-top-app-bar__action-item': inTopAppBar}" @click="$emit('click')">{{icon}}</button>`
});

Vue.component('mdc-button', {
    data: function () {
        return {
            inDialog: false
        }
    },
    props: ['outlined', 'raised', 'unelevated', 'icon', 'disabled'],
    mounted: function () {
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

Vue.component('mdc-switch', {
    data: function () {
        return {
            switchControl: null
        }
    },
    props: ['value', 'label', 'disabled'],
    mounted: function () {
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

Vue.component('mdc-text-field', {
    data: function () {
        return {}
    },
    props: ['value', 'label', 'disabled', 'required', 'maxlength', 'type', 'min', 'max'],
    mounted: function () {
        MDCTextField = window.mdc.textField.MDCTextField;
        const switchControl = new MDCTextField(this.$el);
    },
    template: `
<label :id="'mdc-text-field-l_' + _uid" class="mdc-text-field mdc-text-field--filled">
    <span class="mdc-text-field__ripple"></span>
    <span class="mdc-floating-label" :id="'mdc-text-field_' + _uid">{{label}}</span>
    <input class="mdc-text-field__input" :type="type != null ? type : 'text'" :aria-labelledby="'mdc-text-field_' + _uid" @input="$emit('input', $event.target.value)" :required="required" :disabled="disabled" :maxlength="maxlength" :value="value" :min="min" :max="max">
    <span class="mdc-line-ripple"></span>
</label>
`
});

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
        this.dialog = new window.mdc.dialog.MDCDialog(this.$el);
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