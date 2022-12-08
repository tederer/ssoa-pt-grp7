/* global webshop, process, __dirname */

require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/webserver/Webserver.js');
require('./Service.js');

var DEFAULT_LOG_LEVEL   = 'INFO';
var HTTP_OK             = 200;
var HTTP_ERROR          = 400;
var LOGGER              = webshop.logging.LoggingSystem.createLogger('Webserver');
var logLevel            = webshop.logging.Level[process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL];
var pathPrefix          = '/order';
var version             = webshop.getVersion();

webshop.logging.LoggingSystem.setMinLogLevel(logLevel);

var info = {
   version:    (typeof version === 'string') ? version : 'not available',
   pathPrefix: pathPrefix,
   start:      (new Date()).toISOString()
};

LOGGER.logInfo('version = ' + info.version);
LOGGER.logInfo('log level = ' + logLevel.description);
LOGGER.logInfo('pathPrefix = ' + pathPrefix);
   
var service = new webshop.orders.Service();

var initializationFunction = function initializationFunction(app, webserverLogger) {
   app.get(new RegExp(pathPrefix + '\/byid\/[^\/]+'), (request, response) => {
      var path    = request.path;
      var orderId = path.substring(path.lastIndexOf('/') + 1);
      webserverLogger.logDebug('GET request [path: ' + path + ']');
      // TODO implement searching for the order and return it
      response.status(200).json({ id: orderId});
   });

   app.post(pathPrefix, (request, response) => {
      webserverLogger.logDebug('POST request [path: ' + request.path + ']');
      service.createOrder(request.body)
         .then(result => response.status(HTTP_OK).json(result))
         .catch(error => {
            webserverLogger.logError(error);
            response.status(HTTP_ERROR);
         });
   });
};

var settings = {
   pathPrefix:       pathPrefix, 
   rootFolderPath:   __dirname,
   info:             info
};

webshop.Webserver(settings, initializationFunction);
