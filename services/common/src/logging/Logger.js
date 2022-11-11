/* global assertNamespace, webshop */

require('../NamespaceUtils.js');

assertNamespace('webshop.logging');

/**
 * Logger provides methods to log messages with differen log levels. 
 * Each message accepts a message (String) or a supplier (a function returning a String).
 * Suppliers should get used when the propability is high that the message will not get 
 * logged and building the message costs a lot of time.
 */
webshop.logging.Logger = function Logger() {
   
   var createErrorFor = function createErrorFor(functionName) {
		return new Error('implementation of webshop.logging.Logger did not implement the method \"' + functionName + '\"');
	};
   
   this.setMinLogLevel = function setMinLogLevel(level) {
      throw createErrorFor('setMinLogLevel');
   };

	this.logDebug = function logDebug(messageOrSupplier) {
      throw createErrorFor('logDebug');
   };
	
	this.logInfo = function logInfo(messageOrSupplier) {
      throw createErrorFor('logInfo');
   };
	
	this.logWarning = function logWarning(messageOrSupplier) {
      throw createErrorFor('logWarning');
   };
	
	this.logError = function logError(messageOrSupplier) {
      throw createErrorFor('logError');
   };
};