# coding=utf-8

#  OctoPrint-Dashboard
#
#  Authors:
#   - Jefferey Neuffer (https://github.com/j7126)
#   - Will MacCormack (https://github.com/willmac16)
#   - Stefan Cohen (https://github.com/StefanCohen)
#
#  Copyright (C) 2022
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU Affero General Public License as
#  published by the Free Software Foundation, either version 3 of the
#  License, or (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU Affero General Public License for more details.
#
#  You should have received a copy of the GNU Affero General Public License
#  along with this program.  If not, see <https://www.gnu.org/licenses/>.

"""
Pre-processes gcode files for octoprint dashboard
"""

import re
import octoprint.plugin
import octoprint.filemanager
import octoprint.filemanager.util
import octoprint.util


class GcodePreProcessor(octoprint.filemanager.util.LineProcessorStream):
    """
    Pre-processes gcode files for octoprint dashboard
    """

    def __init__(self,
                 fileBufferedReader,
                 layer_indicator_patterns,
                 layer_move_pattern,
                 filament_change_pattern,
                 python_version,
                 logger):
        super(GcodePreProcessor, self).__init__(fileBufferedReader)
        self.layer_indicator_patterns = layer_indicator_patterns
        self.layer_move_pattern = layer_move_pattern
        self.filament_change_pattern = filament_change_pattern
        self.python_version = python_version
        self.layer_count = 0
        self.layer_moves = 0
        self.layer_move_array = []
        self.filament_change_array = []
        self._logger = logger

    def process_line(self, line):
        if len(line) <= 0:
            return None

        if self.python_version == 3:
            line = line.decode('utf-8')

        line = line.lstrip()

        if re.match(self.layer_move_pattern, line) is not None:
            self.layer_moves += 1

        if self.filament_change_pattern.match(line):
            # give the number of moves in that the change is at
            self.filament_change_array.append(sum(self.layer_move_array) + self.layer_moves)

        for layer_indicator_pattern in self.layer_indicator_patterns:
            if layer_indicator_pattern.match(line):
                self.layer_count += 1
                line = line + "M117 DASHBOARD_LAYER_INDICATOR " + str(self.layer_count) + "\r\n"
                self.layer_move_array.append(self.layer_moves)
                self.layer_moves = 0
                break  # Skip trying to match more patterns

        line = line.encode('utf-8')

        return line
