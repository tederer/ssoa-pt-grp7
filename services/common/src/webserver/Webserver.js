/* global assertNamespace, webshop, process, __dirname */

require('../logging/LoggingSystem.js');
require('../Version.js');

assertNamespace('webshop');

/**
 * constructor function of a webserver
 * pathPrefix              the prefix of the path in the URL starting with a slash
 * initializationFunction  this function gets called before the webserver starts listening 
 *                         and it receiving the Express app object
 */
webshop.Webserver = function Webserver(settings, initializationFunction) {

   var LOGGER                    = webshop.logging.LoggingSystem.createLogger('Webserver');
   var DEFAULT_PORT              = 80;
   
   var express                   = require('express');
   var bodyParser                = require('body-parser');
   var pathToSwaggerUi           = require('swagger-ui-dist').absolutePath();
   var fs                        = require('fs');

   var swaggerClientInitScript   = 'swagger-initializer.js';
   var openApiYamlFilename       = 'openapi.yaml';
   var webserverPort             = process.env.WEBSERVER_PORT ?? DEFAULT_PORT;
   var activateSwagger           = process.env.ACTIVATE_SWAGGER === 'true';
   var app                       = express();
   var openApiYamlUrlPath        = settings.pathPrefix + '/' + openApiYamlFilename;
   var swaggerInitScriptPath     = __dirname + '/' + swaggerClientInitScript;
   var swaggerInitScriptContent;

   try {
      swaggerInitScriptContent = fs.readFileSync(swaggerInitScriptPath, 'utf8').replace('${url}', openApiYamlUrlPath);
   } catch(e) {
      LOGGER.logError('failed to read content of ' + swaggerInitScriptPath + ': ' + e);
   }

   var logGetRequest = function logGetRequest(path) {
      LOGGER.logDebug('GET request [path: ' + path + ']');
   };
   
   app.use(bodyParser.json({ type: 'application/json' })); // makes JSON data (sent in HTTP header) available in request.body

   app.get(settings.pathPrefix + '/info', (request, response) => {
      var path = request.path;
      logGetRequest(path);
      response.status(200).json(settings.info);
   });

   if (activateSwagger) {
      LOGGER.logInfo('swagger UI available at ' + settings.pathPrefix + '/swagger');
      
      app.get(openApiYamlUrlPath, (request, response) => {
         var path = request.path;
         logGetRequest(path);
         response.status(200).sendFile(settings.rootFolderPath + '/' + openApiYamlFilename);
      });

      app.get(settings.pathPrefix + '/swagger/' + swaggerClientInitScript, (request, response) => {
         var path = request.path;
         logGetRequest(path);
         if (swaggerInitScriptContent) {
            response.status(200).type('application/javascript').send(swaggerInitScriptContent);
         } else {
            response.status(500);
         }
      });

      app.use(settings.pathPrefix + '/swagger', express.static(pathToSwaggerUi));
   }

   initializationFunction(app);
   
   app.listen(webserverPort, () => {
      LOGGER.logInfo('web server listening on port ' + webserverPort);
   });
};