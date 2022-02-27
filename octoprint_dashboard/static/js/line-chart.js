Vue.component('line-chart', {
    extends: VueChartJs.Line,
    data: function () {
        return {
            data: [0],
            labels: [''],
            active: true
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
                if (self.active)
                    self.$data._chart.update();
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
        const secondary_color = getComputedStyle(document.documentElement).getPropertyValue('--mdc-theme-secondary');
        this.renderChart({
            labels: this.labels,
            datasets: [
                {
                    label: '',
                    borderColor: secondary_color + '70',
                    backgroundColor: secondary_color + '20',
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
        });
    },
    activated() {
        this.active = true;
    },
    deactivated() {
        this.active = false;
    }
});