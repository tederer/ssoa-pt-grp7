/* global webshop, process, __dirname */

require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/webserver/Webserver.js');
require('./Service.js');

const DEFAULT_LOG_LEVEL = 'INFO';
const HTTP_OK           = 200;
const HTTP_BAD_REQUEST  = 400;
const HTTP_NOT_FOUND    = 404;
const LOGGER            = webshop.logging.LoggingSystem.createLogger('Main');
const logLevel          = webshop.logging.Level[process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL];
const pathPrefix        = '/order';
const version           = webshop.getVersion();

const info = {
   version:    (typeof version === 'string') ? version : 'not available',
   pathPrefix: pathPrefix,
   start:      (new Date()).toISOString()
};

const webserverSettings = {
   pathPrefix:       pathPrefix, 
   rootFolderPath:   __dirname,
   info:             info
};

webshop.logging.LoggingSystem.setMinLogLevel(logLevel);

LOGGER.logInfo('version = ' + info.version);
LOGGER.logInfo('log level = ' + logLevel.description);
LOGGER.logInfo('pathPrefix = ' + pathPrefix);
   
var logRequest = function logRequest(request) {
   LOGGER.logDebug(request.method + ' request [path: ' + request.path + ']');
};

var getOrderId = function getOrderId(request) {
   return request.path.substring(request.path.lastIndexOf('/') + 1);
};

var startup = async function startup() {
   var service = new webshop.orders.Service();
   
   try {
      await service.start();
   } catch(error) {
      LOGGER.logError("failed to start service: " + error);
      process.exit(1);
   }

   webshop.Webserver(webserverSettings, app => {
      app.post(pathPrefix, (request, response) => {
         logRequest(request);
         
         service.createOrder(request.body)
            .then(result => {
               LOGGER.logInfo('created order ' + result.orderId);
               response.status(HTTP_OK).json(result);
            })
            .catch(error => {
               LOGGER.logError(error);
               response.status(HTTP_BAD_REQUEST).end();
            });
      });

      app.get(pathPrefix, (request, response) => {
         logRequest(request);
         
         service.getOrderIds()
            .then(result => response.status(HTTP_OK).json(result))
            .catch(error => {
               LOGGER.logError(error);
               response.status(HTTP_BAD_REQUEST).end();
            });
      });

      app.get(new RegExp(pathPrefix + '\/byid\/[^\/]+'), (request, response) => {
         logRequest(request);
         var orderId = getOrderId(request);
         
         service.getOrder(orderId)
            .then(result => response.status(HTTP_OK).json(result))
            .catch(error => {
               LOGGER.logError(error);
               response.status(HTTP_NOT_FOUND).end();
            });
      });

      app.delete(new RegExp(pathPrefix + '\/byid\/[^\/]+'), (request, response) => {
         logRequest(request);
         var orderId = getOrderId(request);
         
         service.deleteOrder(orderId)
            .then(deletedCount => {
               if (deletedCount > 0) {
                  LOGGER.logInfo('deleted order ' + orderId);
               }
               var statusCode = (deletedCount > 0) ? HTTP_OK : HTTP_NOT_FOUND;
               response.status(statusCode).end();
            })
            .catch(error => {
               LOGGER.logError(error);
               response.status(HTTP_BAD_REQUEST).end();
            });
      });
   });
};

startup();