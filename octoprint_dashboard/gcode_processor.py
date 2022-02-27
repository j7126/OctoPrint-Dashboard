import re
import octoprint.plugin
import octoprint.filemanager
import octoprint.filemanager.util
import octoprint.util


class GcodePreProcessor(octoprint.filemanager.util.LineProcessorStream):
    """
    Pre-processes gcode files for octoprint dashboard
    """

    def __init__(self, fileBufferedReader, layer_indicator_patterns, layer_move_pattern, python_version):
        super(GcodePreProcessor, self).__init__(fileBufferedReader)
        self.layer_indicator_patterns = layer_indicator_patterns
        self.layer_move_pattern = layer_move_pattern
        self.python_version = python_version
        self.current_layer_count = 0
        self.total_layer_count = 0
        self.layer_moves = 0
        self.layer_move_array = []

    def process_line(self, line):
        if len(line) <= 0:
            return None

        if self.python_version == 3:
            line = line.decode('utf-8').lstrip()

        if re.match(self.layer_move_pattern, line) is not None:
            self.layer_moves += 1

        for layer_indicator_pattern in self.layer_indicator_patterns:
            if layer_indicator_pattern.match(line):
                self.current_layer_count += 1
                line = line + "M117 DASHBOARD_LAYER_INDICATOR " + \
                    str(self.current_layer_count) + "\r\n"
                self.total_layer_count = self.current_layer_count
                self.layer_move_array.append(self.layer_moves)
                self.layer_moves = 0
                break  # Skip trying to match more patterns

        if self.python_version == 3:
            line = line.encode('utf-8')

        return line
