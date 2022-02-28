'use strict';

OctoPrint.options.baseurl = '/';

import Dashboard from './dashboard.js';
import DashboardPlugin from './plugin.js';
import DashboardWidget from './widget.js';

$(async function () {
    window.Dashboard = Dashboard;
    window.DashboardPlugin = DashboardPlugin;
    window.DashboardWidget = DashboardWidget;

    Dashboard.RegisterPlugin((await import('./dashboard-plugin.js')).default);

    window.dashboard = new Dashboard();
    window.dashboard.unready();
});