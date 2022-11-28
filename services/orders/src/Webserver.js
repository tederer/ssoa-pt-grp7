/* global webshop, process */
require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/Version.js');

var express 			= require('express');
var bodyParser       = require('body-parser');
var pathToSwaggerUi 	= require('swagger-ui-dist').absolutePath()

var LOGGER 					 = webshop.logging.LoggingSystem.createLogger('Webserver');
var DEFAULT_PORT			 = 80;
var DEFAULT_LOG_LEVEL    = 'INFO';

var webserverPort			 = process.env.WEBSERVER_PORT ?? DEFAULT_PORT;
var logLevel	          = webshop.logging.Level[process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL];
var app						 = express();
var textBodyParser   	 = bodyParser.text({ type: 'application/json' });

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

var logGetRequest = function logGetRequest(path) {
	LOGGER.logDebug('GET request [path: ' + path + ']');
};

var logPostRequest = function logPostRequest(path) {
	LOGGER.logDebug('POST request [path: ' + path + ']');
};

app.use(textBodyParser); // makes JSON data (sent in HTTP header) available in request.body

app.get(/\/order\/info/, (request, response) => {
	var path = request.path;
	logGetRequest(path);
	response.status(200).json(info);
});

app.get('/order/openapi.yaml', (request, response) => {
	var path = request.path;
	logGetRequest(path);
	response.status(200).sendFile(__dirname + '/openapi.yaml');
});

app.get('/order/swagger/swagger-initializer.js', (request, response) => {
	var path = request.path;
	logGetRequest(path);
	response.status(200).sendFile(__dirname + '/swagger-initializer.js');
});

app.use('/order/swagger', express.static(pathToSwaggerUi));

app.get(/\/order\/[^\/]+/, (request, response) => {
	var path 	= request.path;
	var orderId = path.substring(path.lastIndexOf('/') + 1);
	logGetRequest(path);
	// TODO implement searching for the order and return it
	response.status(200).json({ id: orderId});
});

app.post('/order', (request, response) => {
	var path = request.path;
	var data = request.body;
	logPostRequest(path);
	// TODO implement creation of order
	response.status(200).json({ id: 'foo'});
});

app.listen(webserverPort, () => {
	LOGGER.logInfo('web server listening on port ' + webserverPort);
});
