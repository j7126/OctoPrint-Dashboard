import widget_text from '../widgets/text.js';
import widget_img from '../widgets/img.js';
import widget_gauge from '../widgets/gauge.js';

export default class _dashboard extends DashboardPlugin {
    constructor() {
        super();
    }

    static identifier = '_dashboard';

    get_data_points() {
        return {
            /* Octoprint Data (dashboard plugin) */
            totalLayers: 'Total number of layers in the current file',
            currentLayer: 'The currently printing layer number',
            currentHeight: 'The current height of the print',
            totalHeight: 'The total height of the print (when it is done)',
            feedrate: null,
            feedrateG0: null,
            feedrateG1: null,
            fanspeed: null,
            lastLayerDuration: null,
            lastLayerDurationInSeconds: null,
            averageLayerDuration: null,
            averageLayerDurationInSeconds: null,
            changeFilamentTimeLeftInSeconds: null,
            changeFilamentCount: null,
            cpuPercent: 'CPU utilisation as a percentage',
            cpuFreq: 'CPU frequency',
            virtualMemPercent: 'Memory utilisation percentage',
            diskUsagePercent: null,
            cpuTemp: 'CPU temperature',
            printerMessage: 'The message on the printer LCD',
            extrudedFilament: null,
            cmdResults: [],
        };
    }

    get_widgets() {
        return [
            widget_text,
            widget_img,
            widget_gauge
        ];
    }
}