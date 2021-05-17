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