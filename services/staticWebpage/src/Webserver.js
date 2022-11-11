/* global webshop, process */
require('./logging/LoggingSystem.js');
require('./Version.js');

var fs 						 = require('fs');
var express 				 = require('express');
var https					 = require('https');
var path                 = require('node:path');

var LOGGER 					 = webshop.logging.LoggingSystem.createLogger('Webserver');
var DEFAULT_PORT			 = 80;
var DEFAULT_LOG_LEVEL    = 'INFO';
var DEFAULT_INDEX_FILE   = 'index.html';

var webserverPort			 = process.env.WEBSERVER_PORT ?? DEFAULT_PORT;
var webRootFolder		    = path.resolve(path.dirname(process.argv[1]), '..') + '/webroot';
var logLevel	          = webshop.logging.Level[process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL];
var app						 = express();

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

var logRequest = function logRequest(request,response, next) {
	LOGGER.logDebug(() => '\nREQUEST for "' + request.url + '" received');
	next();
};
 
var replaceSpacesInRequestUrlByEscapeSequence = function replaceSpacesInRequestUrlByEscapeSequence(request,response, next) {
	request.url = request.url.replace(/%20/g, ' ');
	next();
};

var sendInternalServerError = function sendInternalServerError(response, text) {
	response.writeHeader(500, {'Content-Type': 'text/plain'});  
	response.write(text);  
	response.end();
};
 
var handleFileRequests = function handleFileRequests(request, response) {
	var requestedDocumentUrl  = request.url;
	var absolutePathOfRequest = webRootFolder + requestedDocumentUrl;
	
	LOGGER.logInfo('request for ' + requestedDocumentUrl);

	if (absolutePathOfRequest.endsWith('/')) {
		absolutePathOfRequest += DEFAULT_INDEX_FILE;
	} 
	
	if (!fs.existsSync(absolutePathOfRequest)) {   
		LOGGER.logInfo(absolutePathOfRequest + ' does not exist -> sending internal server error');
		sendInternalServerError(response, requestedDocumentUrl + ' does not exist');
	} else {
		LOGGER.logInfo('returning ' + absolutePathOfRequest);
		response.sendFile(absolutePathOfRequest);
	}
};

app.get(/\/info/, (request, response) => {
	var path = request.path;
	LOGGER.logDebug('GET request [path: ' + path + ']');
	response.status(200).json(info);
});

app.get('*', replaceSpacesInRequestUrlByEscapeSequence);
app.get('*', logRequest);
app.get('*', handleFileRequests );

app.listen(webserverPort, () => {
	LOGGER.logInfo('web server listening on port ' + webserverPort);
});
