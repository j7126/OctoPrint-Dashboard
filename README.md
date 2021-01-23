# OctoPrint-Dashboard

A dashboard tab for Octoprint that displays the most relevant info regarding the state of the printer and any on-going print jobs.

## NOTE

Maintenance of this plugin has been taken over by new maintainers. (as of 27/09/2020)

![Screenshot](https://github.com/j7126/OctoPrint-Dashboard/blob/master/screenshots/screenshot-2.png)


## Features

* Adds a new tab first in the list and becomes the default tab when opening OctoPrint
* Includes the following widgets:
    * RPi host CPU Load, CPU Temp, CPU frequency, Mem Utilization, Storage Utilization.   
    * Printer profile, Connection status, Printer Status
    * Hotend temp(s), Bed Temp, Chamber Temp, Fan speed
    * Temperature/Humidity sensors.
    * Shell command output 
    * Printed file, Job Progress, Layer Progress
    * Layer Duration Graph 
    * Estimated total time, ETA, Time left, Time since print started
    * Current layer, Total layers
    * Current height, Total height
    * Average layer time
    * WebCam view
* Settings to configure what widgets and info to show on the Dashboard
* Supports multiple hotends as configured in the printer profile
* Supports chamber temperature if configured in the printer profile
* Configurable progress gauge type (Circle, Bar) 
* Fullscreen mode including job control buttons (Start, Cancel, Pause/Resume)
* Full page mode by adding `?dashboard=full` parameter at the end of the octoprint url
* Uses Estimates from [PrintTimeGenius](https://plugins.octoprint.org/plugins/PrintTimeGenius/) when installed
* Uses GCode analysis provided by [DisplayLayerProgress](https://plugins.octoprint.org/plugins/DisplayLayerProgress/) to present layer and fan data 
* Theme friendly:

![Screenshot](https://github.com/j7126/OctoPrint-Dashboard/blob/master/screenshots/screenshot-2-theme.png)

## What's new?
For release notes and release history, please visit the [wiki](https://github.com/j7126/OctoPrint-Dashboard/wiki).

## Known limitations
* Translations to other languages is not supported yet.
* The CPU-temp will likely only work on a Raspberry Pi. 
* Disk Usage will likely only work on Linux deratives.
* UI testing is limited to latest versions of desktop browsers: Safari, Chrome and Firefox
* Plugin testing is limited to latest verson of OctoPi on RPi3b and 3b+ 

## Dependencies

This plugin depends on [DisplayLayerProgress](https://plugins.octoprint.org/plugins/DisplayLayerProgress/) to be installed. DisplayLayerProgress provides GCode analysis for the Fan, Layer, Height and Layer Average stats. Only the backend events from DisplayLayerProgress are used by the Dashboard plugin so you may disable "Navigationbar" and "Printer Display" in the DisplayLayerProgress plugin settings if you don't want to see them in the UI. 

From v1.10.0, this plugin also depends on the Gcode Visualizer tab to be enabled. 

From v1.11.0, ths plugin optionally depends on the [Enclosure Plugin](https://plugins.octoprint.org/plugins/enclosure/) to provide Temperature/Humidity sensor readings. Please see the plugins [GitHub page](https://github.com/vitormhenrique/OctoPrint-Enclosure) for installation and configuration instructions.

The dashboard uses the time estimates provided by PrintTimeGenius if it is installed but it is not required.

## Credits

* Inspired by OctoDash: https://github.com/UnchartedBull/OctoDash/
* Icons from: http://www.iconninja.com
* Chartist chart framework: https://gionkunz.github.io/chartist-js/ [license](https://github.com/gionkunz/chartist-js/blob/master/LICENSE-WTFPL)
* Plugin originally by: StefanCohen
* Currently maintained by: j7126 and Willmac16
* Github Contributors: Andy Harrison (wizard04wsu), Doug Hoyt (doughoyt), Olli (OllisGit), OverLoad (overload08), spiff72, CynanX, Klammerson, 0xz00n, cp2004, clonesht
* Community support and encouragement: OutsourcedGuru, jneilliii, foosel

## Support OctoPrint

I'm just doing this for fun and I don't ask for anything in return. If you want to make a donation then [support Octoprint instead](https://octoprint.org/support-octoprint/). Gina is the one who deserves it for creating and maintaining Octoprint.

## Setup

Install via the bundled [Plugin Manager](https://github.com/foosel/OctoPrint/wiki/Plugin:-Plugin-Manager) or manually using this URL:

    https://github.com/j7126/OctoPrint-Dashboard/archive/master.zip

## Configuration

* For configuration help, please visit the [wiki](https://github.com/j7126/OctoPrint-Dashboard/wiki).

## Screenshots

![Screenshot](https://github.com/j7126/OctoPrint-Dashboard/blob/master/screenshots/screenshot-theme2.png)
Fullscreen:
![Screenshot](https://github.com/j7126/OctoPrint-Dashboard/blob/master/screenshots/screenshot-2-fullscreen.png)
![Screenshot](https://github.com/j7126/OctoPrint-Dashboard/blob/master/screenshots/screenshot-fullscreen.png)
