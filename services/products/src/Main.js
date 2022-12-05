/* global webshop, process, __dirname */

require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/webserver/Webserver.js');

var DEFAULT_LOG_LEVEL = 'INFO';
var LOGGER            = webshop.logging.LoggingSystem.createLogger('Webserver');
var logLevel          = webshop.logging.Level[process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL];
var pathPrefix        = '/product';

webshop.logging.LoggingSystem.setMinLogLevel(logLevel);

LOGGER.logInfo('log level = ' + logLevel.description);

var initializationFunction = function initializationFunction(app, webserverLogger) {
   app.get(new RegExp(pathPrefix + '\/byid\/[^\/]+'), (request, response) => {
      var path      = request.path;
      var productId = path.substring(path.lastIndexOf('/') + 1);
      webserverLogger.logDebug('GET request [path: ' + path + ']');
      // TODO implement searching for the order and return it
      response.status(200).json({ id: productId});
   });

   app.post(pathPrefix, (request, response) => {
      var path = request.path;
      var data = request.body;
      webserverLogger.logDebug('POST request [path: ' + path + ']');
      // TODO implement creation of order
      response.status(200).json({ id: 'foo'});
   });
};

var settings = {
   pathPrefix: pathPrefix, 
   rootFolderPath: __dirname
};

webshop.Webserver(settings, initializationFunction);
