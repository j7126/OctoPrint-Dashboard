# OctoPrint-Dashboard

A dashboard tab for Octoprint that displays the most relevant info regarding the state of the printer and any on-going print jobs.

![Screenshot](https://github.com/StefanCohen/OctoPrint-Dashboard/blob/master/screenshot.png)

## Features

* Adds a new tab first in the list and becomes the default tab when opening OctoPrint
* Widgets for current:
    * RPi iost CPU Load, CPU Temp, Mem Utilization, Storage Utilization.   
    * Printer profile, Connection status, Printer Status
    * Hotend temp(s), Bed Temp, Chamber Temp, Fan speed
    * Printed file, Progress
    * Layer Duration Graph 
    * Estimated total time, ETA, Time left, Time since print started
    * Current layer, Total layers
    * Current height, Total height
    * Average layer time
    * WebCam view
* Supports multiple hotends as configured in the printer profile
* Supports chamber temperature if configured in the printer profile
* Configurable progress gauge type (Circle, Bar) 
* Fullscreen mode
* Full page mode by adding `?dashboard=full` parameter at the end of the octoprint url
* Uses Estimates from [PrintTimeGenius](https://plugins.octoprint.org/plugins/PrintTimeGenius/) when installed
* Uses GCode analysis provided by [DisplayLayerProgress](https://plugins.octoprint.org/plugins/DisplayLayerProgress/) to present layer and fan data 
* Theme friendly:

![Screenshot](https://github.com/StefanCohen/OctoPrint-Dashboard/blob/master/screenshot-theme.png)

## What's new?
For release notes and release history, please visit the [wiki](https://github.com/StefanCohen/OctoPrint-Dashboard/wiki).

## Known limitations
* Translations to other languages is not supported yet.
* The CPU-temp will likely only work on a Raspberry Pi. 
* Disk Usage will likely only work on Linux deratives.
* UI testing is limited to latest versions of desktop browsers: Safari, Chrome and Firefox
* Plugin testing is limited to latest verson of OctoPi on RPi3b and 3b+ 

## Dependencies

This plugin depends on [DisplayLayerProgress](https://plugins.octoprint.org/plugins/DisplayLayerProgress/) to be installed. DisplayLayerProgress provides GCode analysis for the Fan, Layer, Height and Layer Average stats. Only the backend events from DisplayLayerProgress are used by the Dashboard plugin so you may disable "Navigationbar" and "Printer Display" in the DisplayLayerProgress plugin settings if you don't want to see them in the UI. 

The dashboard uses the time estimates provided by PrintTimeGenius if it is installed but it is not required.

## Credits

* Inspired by OctoDash: https://github.com/UnchartedBull/OctoDash/
* Icons from: http://www.iconninja.com
* Context Menus: https://github.com/nescalante/knockout.contextmenu [license](https://github.com/nescalante/knockout.contextmenu/blob/master/LICENSE)
* Chartist chart framework: https://gionkunz.github.io/chartist-js/ [license](https://github.com/gionkunz/chartist-js/blob/master/LICENSE-WTFPL)
* Github Contributors: Andy Harrison (wizard04wsu), Doug Hoyt (doughoyt), (j7126), Olli (OllisGit) 

## Setup

Install via the bundled [Plugin Manager](https://github.com/foosel/OctoPrint/wiki/Plugin:-Plugin-Manager) or manually using this URL:

    https://github.com/StefanCohen/OctoPrint-Dashboard/archive/master.zip

## Configuration

* For configuration help, please visit the [wiki](https://github.com/StefanCohen/OctoPrint-Dashboard/wiki).

![Screenshot](https://github.com/StefanCohen/OctoPrint-Dashboard/blob/master/screenshot-theme2.png)