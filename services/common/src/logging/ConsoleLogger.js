/* global assertNamespace, webshop */

require('../NamespaceUtils.js');
require('./Logger.js');
require('./LoggingSystem.js');

assertNamespace('webshop.logging');

/**
 * ConsoleLogger writes the log output to the console.
 */
webshop.logging.ConsoleLogger = function ConsoleLogger(name, minLogLevel) {
   var MESSAGE_SEPARATOR = ';';
   var logLevel = minLogLevel;

   var formatNumber = function formatNumber(expectedLength, number) {
      var result = number.toString();
      while(result.length < expectedLength) {
         result = '0' + result;
      }
      return result;
   };

   var log = function log(level, messageOrSupplier) {
      if (level.value >= logLevel.value) {
         var timestamp = (new Date()).toISOString();
         var message = typeof messageOrSupplier === 'function' ? messageOrSupplier() : messageOrSupplier;
         console.log([timestamp, level.description, name, message].join(MESSAGE_SEPARATOR));
      }
   };

   this.setMinLogLevel = function setMinLogLevel(minLogLevel) {
      logLevel = minLogLevel;
   };

   this.logDebug = function logDebug(messageOrSupplier) {
      log(webshop.logging.Level.DEBUG, messageOrSupplier);
   };
   
   this.logInfo = function logInfo(messageOrSupplier) {
      log(webshop.logging.Level.INFO, messageOrSupplier);
   };
   
   this.logWarning = function logWarning(messageOrSupplier) {
      log(webshop.logging.Level.WARNING, messageOrSupplier);
   };
   
   this.logError = function logError(messageOrSupplier) {
      log(webshop.logging.Level.ERROR, messageOrSupplier);
   };
};

webshop.logging.ConsoleLogger.prototype = new webshop.logging.Logger();