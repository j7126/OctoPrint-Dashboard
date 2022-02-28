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
            props: ['widget', 'settings', 'outlined'],
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
<div class="mdc-card" :class="{'mdc-card--outlined': outlined}">
    <div v-if="widget.data.img" class="media"><img :src="getImg(widget.data.img)"></div>
    <div class="wrapper-text">
        <div class="subtitle" v-if="widget.title">{{widget.title}}</div>
    </div>
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
            props: ['widget'],
            template: `
<div>
    <br>
    <mdc-text-field style="width: 100%;" label="Image Url" required
        v-model="widget.data.img">
    </mdc-text-field>
</div>
`
        };
    }
}