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