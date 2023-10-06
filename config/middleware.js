var log = require("./log");
const constant = require("../constant");
const reqPromise = require('request-promise');

exports.postRequest = function (url, business, data) {
    let headers = {
        'Authorization': 'Basic eWFwcGF5OnlhcHBheQ==',
        'Content-Type': 'application/json',
        'TENANT': business,
        'APPLICATION': constant.APPLICATION
    };

    let options = {
        uri: url,
        method: 'POST',
        body: data,
        headers: headers,
        json: true,
        resolveWithFullResponse: true,
        simple: false
    };

    log.info(`Hitting url :: ${url} with headers :: ${JSON.stringify(headers)} and body :: ${JSON.stringify(data)}`);
    return reqPromise(options)
};