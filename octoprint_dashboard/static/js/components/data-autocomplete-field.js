Vue.component('data-autocomplete-field', {
    data: function () {
        return {
            menu: null,
            selected: null,
            showing: false,
            val: null,
            showMenu: false,
            height: 0,
            top: true,
        };
    },
    props: ['value', 'label'],
    watch: {
        val(val) {
            this.$emit('input', val);
            this.showMenu = val != '';
        },
    },
    computed: {
        items() {
            var items = [];
            this.$root.dataNames.forEach(item => {
                if (this.filter(item, this.val))
                    items.push(item);
            });
            return items;
        },
    },
    methods: {
        select(name) {
            this.val = this.value.replace(/(?<=^[^%]*((%%)[^%]*(%%)[^%]*)*(%%)[^%]*)(?<=%%)[^%]*$/s, name + '%%');
            return false;
        },
        filter(item, query = this.val) {
            var m = query?.match(/(?<=^[^%]*((%%)[^%]*(%%)[^%]*)*(%%)[^%]*)(?<=%%)[^%]*$/s);
            if (m == null || m[0] == null) {
                return false;
            }
            return item.name.toLowerCase().includes(m[0].toLowerCase());
        },
        calculateHeight() {
            this.height = (window.innerHeight - 100) / 2;
            let rect = document.getElementById('data-autocomplete_' + this._uid)?.getBoundingClientRect();
            this.top = rect == null ? false : rect.top > this.height;
        },
        click() {
            this.calculateHeight();
            this.showMenu = this.val != '';
        }
    },
    created() {
        window.addEventListener('resize', this.calculateHeight);
    },
    destroyed() {
        window.removeEventListener('resize', this.calculateHeight);
    },
    beforeMount() {
        this.calculateHeight();
        this.val = this.value;
    },
    mounted() {
        this.calculateHeight();
    },
    template: `
<div>
    <div :id="'data-autocomplete_' + _uid">
        <v-text-field hide-details :label="label" v-model="val" filled @click="click"></v-text-field>
    </div>
    <v-menu :activator="'#data-autocomplete_' + _uid" :close-on-content-click="false" offset-y :top="top" :max-height="height" :content-class="items.length == 0 ? 'data-autocomplete-hidden' : ''">
        <v-list v-if="items.length != 0">
            <v-list-item-group>
                <v-list-item v-for="(item, index) in items" :key="index" @click="select(item.name)">
                    <v-list-item-title>
                        <strong>{{ item.name }}</strong>
                        {{ item.description != null ? ': ' + item.description : '' }}
                    </v-list-item-title>
                </v-list-item>
            </v-list-item-group>
        </v-list>
    </v-menu>
</div>`
});