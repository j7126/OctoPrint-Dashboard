# OctoPrint-Dashboard

A dashboard tab for Octoprint that displays the most relevant info regarding the state of the printer and any on-going print jobs.

![Screenshot](https://github.com/StefanCohen/OctoPrint-Dashboard/blob/master/screenshot.png)

## Features

* Adds a new tab first in the list and becomes the default tab when opening OctoPrint
* Widgets for current:  
    * Printer profile, Connection status, Printer Status
    * Hotend temp(s), Bed Temp, Chamber Temp, Fan speed
    * Printed file, Progress
    * Estimated total time, ETA, Time left, Time since print started
    * Current layer, Total layers
    * Current height, Total height
    * Average layer time
* Supports multiple hotends as configured in the printer profile
* Supports chamber temperature if configured in the printer profile
* Configurable progress gauge type (Circle, Bar) 
* Uses Estimates from [PrintTimeGenius](https://plugins.octoprint.org/plugins/PrintTimeGenius/) when installed
* Uses GCode analysis provided by [DisplayLayerProgress](https://plugins.octoprint.org/plugins/DisplayLayerProgress/) to get more accurate layer and fan data 
* Theme friendly:

![Screenshot](https://github.com/StefanCohen/OctoPrint-Dashboard/blob/master/screenshot-theme.png)


## Known limitations
* Translations to other languages are not supported yet.

## Dependencies

This plugin depends on [DisplayLayerProgress](https://plugins.octoprint.org/plugins/DisplayLayerProgress/) to be installed in order to provide all metrics. DisplayLayerProgress provides GCode analysis for the Dashboard. Only the events from DisplayLayerProgress are used by the Dashboard plugin so you may disable "Navigationbar" and "Printer Display" in the DisplayLayerProgress plugin settings if you want to see them in the UI. 

The dashboard uses the time estimates provided by PrintTimeGenius if it is installed but it is not required.

## Credits

Inspired by OctoDash: https://github.com/UnchartedBull/OctoDash/
Icons from: http://www.iconninja.com

## Setup

Install via the bundled [Plugin Manager](https://github.com/foosel/OctoPrint/wiki/Plugin:-Plugin-Manager) or manually using this URL:

    https://github.com/StefanCohen/OctoPrint-Dashboard/archive/master.zip

## Configuration

* Two progress gauge types can be configured in the plugin settings: Bar & Circle (default). The Bar gauge can be useful if you have multiple hotends or a heated chamber.
* Octoprint defaults to showing "fuzzy print time estimates" and these are displayed by the dashboard (example: Estimated print time: 1 hour). If you prefer the hh:mm:ss format used elsewhere, go to Settings/Appearance and untick "Show fuzzy print time estimates".

For users of Themeify:

"fas fa-tachometer-alt" is a suitable icon for Custom Tab-icons

For custom styles:

| Selector          | CSS-Rule | 
|-------------------|----------|
| .dashboardLarge   | color    |
| .dashboardSmall   | color    |
| .dashboardGauge   | stroke   |
| svg text          | fill     |

![Screenshot](https://github.com/StefanCohen/OctoPrint-Dashboard/blob/master/screenshot-theme2.png)
