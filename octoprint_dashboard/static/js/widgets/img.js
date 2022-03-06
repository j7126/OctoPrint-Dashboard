'use strict';

export default class widget_img extends DashboardWidget {
    constructor() {
        super();
    }

    label = 'Image';

    build_widget() {
        return {
            data: function () {
                return {};
            },
            props: ['widget', 'settings'],
            computed: {
                getImg: function () {
                    return img => {
                        if (img == 'webcam')
                            return this.settings && this.settings.webcam && this.settings.webcam.streamUrl;
                        return img;
                    };
                }
            },
            template: `
<div class="wrapper">
    <div class="small" style="margin: 8px;" v-if="widget.title">{{widget.title}}</div>
    <img class="media" v-if="widget.data?.img" :src="getImg(widget.data?.img)">
</div>
`
        };
    }

    build_settings() {
        return {
            data: function () {
                return {};
            },
            mounted: function () {
                if (this.widget.data == null) {
                    this.widget.data = { img: '' };
                }
            },
            beforeMount: function () {
                if (this.widget.data == null)
                    this.widget.data = { img: '' };
            },
            props: ['widget'],
            template: `
<v-text-field hide-details="auto" filled label="Image Url *" :rules="$root.requiredRule" v-model="widget.data.img"></v-text-field>
`
        };
    }
}