/*
 * OctoPrint-Dashboard error reporter
 *
 * Authors: Jefferey Neuffer (https://github.com/j7126), Will MacCormack (https://github.com/willmac16), Stefan Cohen (https://github.com/StefanCohen)
 * 
 * Copyright (C) 2021
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// report js errors to the backend to be logged
window.onerror = function (msg, url, lineNo, columnNo, error) {
    var message;
    if (msg.toLowerCase().indexOf("script error") > -1) {
        message = 'Script Error: See Browser Console for Detail';
    } else {
        var message = [
            'Message: ' + msg,
            'URL: ' + url,
            'Line: ' + lineNo,
            'Column: ' + columnNo,
            'Error object: ' + JSON.stringify(error)
        ].join(' - ');
    }

    $.ajax({
        url: API_BASEURL + "plugin/dashboard",
        type: "POST",
        dataType: "json",
        data: JSON.stringify({
            command: "jsError",
            msg: message
        }),
        contentType: "application/json; charset=UTF-8"
    });

    return false;
};
