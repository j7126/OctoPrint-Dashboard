Vue.component('indent-block', {
    template: `
<div style="width: calc(100% - 20px); margin-left: 20px; margin-top: 10px;">
    <slot></slot>
</div>
`
});

Vue.component('space', {
    template: `
<div style="display: block;height: 1em;"></div>
`
});