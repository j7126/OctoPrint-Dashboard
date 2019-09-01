# OctoPrint-Dashboard

A dashboard tab for Octoprint that displays the most relevant info regarding the state of the printer and any on-going print jobs.

Note! This is a work in progress and may be buggy and/or incomplete

![Screenshot](https://github.com/StefanCohen/OctoPrint-Dashboard/blob/master/screenshot.png)

## Features

* Shows stats for:  
    * Printer profile, Connection status, Printer Status
    * Hotend temp, Bed Temp, Fan speed
    * Printed file, Progress
    * Estimated total time, Elapsed time, Estimated time left
    * Current layer, Total layers
    * Current height, Total height
    * Average layer time
* Uses Estimates from [PrintTimeGenius](https://plugins.octoprint.org/plugins/PrintTimeGenius/) when installed
* Uses GCode analysis provided by [DisplayLayerProgress](https://plugins.octoprint.org/plugins/DisplayLayerProgress/) to get more accurate layer and fan data 
* Theme friendly:

![Screenshot](https://github.com/StefanCohen/OctoPrint-Dashboard/blob/master/screenshot-theme.png)


## Dependencies

This plugin depends on [DisplayLayerProgress](https://plugins.octoprint.org/plugins/DisplayLayerProgress/) to be installed in order to work fully. DisplayLayerProgress provides GCode analysis for the Dashboard.

## Credits

Inspired by OctoDash: https://github.com/UnchartedBull/OctoDash/
Icons from: http://www.iconninja.com

## Setup

Install via the bundled [Plugin Manager](https://github.com/foosel/OctoPrint/wiki/Plugin:-Plugin-Manager)
or manually using this URL:

    https://github.com/StefanCohen/OctoPrint-Dashboard/archive/master.zip

## Configuration

No configuration is needed.
