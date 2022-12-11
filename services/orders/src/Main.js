/* global webshop, process, __dirname */

require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/webserver/Webserver.js');
require('./Service.js');

var DEFAULT_LOG_LEVEL   = 'INFO';
var HTTP_OK             = 200;
var HTTP_BAD_REQUEST    = 400;
var HTTP_NOT_FOUND      = 404;
var LOGGER              = webshop.logging.LoggingSystem.createLogger('Main');
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

var initializationFunction = function initializationFunction(app) {
   app.post(pathPrefix, (request, response) => {
      LOGGER.logDebug('POST request [path: ' + request.path + ']');
      
      service.createOrder(request.body)
         .then(result => response.status(HTTP_OK).json(result))
         .catch(error => {
            LOGGER.logError(error);
            response.status(HTTP_BAD_REQUEST).end();
         });
   });

   app.get(pathPrefix, (request, response) => {
      LOGGER.logDebug('GET request [path: ' + request.path + ']');
      
      service.getOrderIds()
         .then(result => response.status(HTTP_OK).json(result))
         .catch(error => {
            LOGGER.logError(error);
            response.status(HTTP_BAD_REQUEST).end();
         });
   });

   app.get(new RegExp(pathPrefix + '\/byid\/[^\/]+'), (request, response) => {
      var path    = request.path;
      var orderId = path.substring(path.lastIndexOf('/') + 1);
      LOGGER.logDebug('GET request [path: ' + path + ']');
      
      service.getOrder(orderId)
         .then(result => response.status(HTTP_OK).json(result))
         .catch(error => {
            LOGGER.logError(error);
            response.status(HTTP_NOT_FOUND).end();
         });
   });

   app.delete(new RegExp(pathPrefix + '\/byid\/[^\/]+'), (request, response) => {
      var path    = request.path;
      var orderId = path.substring(path.lastIndexOf('/') + 1);
      LOGGER.logDebug('DELETE request [path: ' + path + ']');
      
      service.deleteOrder(orderId)
         .then(result => {
            var statusCode = (result.deletedCount > 0) ? HTTP_OK : HTTP_NOT_FOUND;
            response.status(statusCode).end();
         })
         .catch(error => {
            LOGGER.logError(error);
            response.status(HTTP_BAD_REQUEST).end();
         });
   });
};

var settings = {
   pathPrefix:       pathPrefix, 
   rootFolderPath:   __dirname,
   info:             info
};

webshop.Webserver(settings, initializationFunction);
