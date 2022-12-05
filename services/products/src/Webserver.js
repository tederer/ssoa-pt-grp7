/* global webshop, process */
require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/Version.js');

var fs                   = require('fs');
var express              = require('express');
var path                 = require('node:path');

var LOGGER               = webshop.logging.LoggingSystem.createLogger('Webserver');
var DEFAULT_PORT         = 80;
var DEFAULT_LOG_LEVEL    = 'INFO';

var webserverPort        = process.env.WEBSERVER_PORT ?? DEFAULT_PORT;
var logLevel             = webshop.logging.Level[process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL];
var app                  = express();

webshop.logging.LoggingSystem.setMinLogLevel(logLevel);

LOGGER.logInfo('log level = ' + logLevel.description);

var info = {
    version:    webshop.getVersion(),
    start:      (new Date()).toISOString()
};

if (typeof info.version === 'string') {
    LOGGER.logInfo('version = ' + info.version);
} else {
    LOGGER.logError('failed to evaluate version: ' + info.version.message);
}

app.get(/\/info/, (request, response) => {
   var path = request.path;
   LOGGER.logDebug('GET request [path: ' + path + ']');
   response.status(200).json(info);
});

app.get(/\/products/, (request, response) => {
   var path = request.path;
   LOGGER.logDebug('GET request [path: ' + path + ']');
   var products = {
      products: []
   };
   response.status(200).json(products);
});

app.listen(webserverPort, () => {
   LOGGER.logInfo('web server listening on port ' + webserverPort);
});
