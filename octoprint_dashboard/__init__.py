# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin

class DashboardPlugin(octoprint.plugin.SettingsPlugin,
                      octoprint.plugin.StartupPlugin,
                      octoprint.plugin.AssetPlugin,
                      octoprint.plugin.TemplatePlugin,
		      octoprint.plugin.EventHandlerPlugin):

	def __init__(self):	
		_currentLayer = "-"

	def on_after_startup(self):
        	self._logger.info("Dashboard started")

	def on_event(self, event, payload):
		if event == "DisplayLayerProgress_layerChanged":
        		self._logger.info("### Layer changed")
			self._logger.info(payload.get('currentLayer'))
			self._currentLayer = payload.get('currentLayer') #REMOVEME
			self._plugin_manager.send_plugin_message(self._identifier, dict(currentLayer=payload.get('currentLayer')))

	##~~ SettingsPlugin mixin

	def get_settings_defaults(self):
		return dict(
			# put your plugin's default settings here
		)

	##~~ AssetPlugin mixin

	def get_assets(self):
		# Define your plugin's asset files to automatically include in the
		# core UI here.
		return dict(
			js=["js/dashboard.js"],
			css=["css/dashboard.css"],
			less=["less/dashboard.less"]
		)



	##~~ Softwareupdate hook

	def get_update_information(self):
		# Define the configuration for your plugin to use with the Software Update
		# Plugin here. See https://github.com/foosel/OctoPrint/wiki/Plugin:-Software-Update
		# for details.
		return dict(
			dashboard=dict(
				displayName="Dashboard Plugin",
				displayVersion=self._plugin_version,

				# version check: github repository
				type="github_release",
				user="StefanCohen",
				repo="OctoPrint-Dashboard",
				current=self._plugin_version,

				# update method: pip
				pip="https://github.com/StefanCohen/OctoPrint-Dashboard/archive/{target_version}.zip"
			)
		)


__plugin_name__ = "Dashboard"

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = DashboardPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
	}
	
	global __plugin_settings_overlay__
	__plugin_settings_overlay__ = dict(appearance=dict(components=dict(order=dict(tab=["plugin_dashboard",
                                                                                        "temperature",
                                                                                        "control",
                                                                                        "gcodeviewer",
                                                                                        "terminal",
                                                                                        "timelapse"]))))
