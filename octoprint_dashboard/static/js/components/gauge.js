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