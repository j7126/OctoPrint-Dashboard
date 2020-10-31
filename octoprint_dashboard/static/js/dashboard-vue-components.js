Vue.component('line-chart', {
    extends: VueChartJs.Line,
    data: function () {
        return {
            data: [0],
            labels: ['']
        };
    },
    props: ['value'],
    watch: {
        value: function (val) {
            this.data.push(val);
            if (this.data.length > 50) {
                this.data.splice(0, 1);
            } else
                this.labels.push('');
            this.$data._chart.update()
        }
    },
    mounted() {
        this.renderChart({
            labels: this.labels,
            datasets: [
                {
                    label: '',
                    borderColor: '#01878670',
                    backgroundColor: '#cbe7e670',
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
        })
    }
});