/* global webshop, assertNamespace */

require('../../common/src/NamespaceUtils.js');
require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/Version.js');

assertNamespace('webshop');

webshop.MainInitializer = {

   initialize: function initialize(pathPrefix) {
      const DEFAULT_LOG_LEVEL = 'INFO';
      const LOGGER            = webshop.logging.LoggingSystem.createLogger('MainInitializer');
      const logLevel          = webshop.logging.Level[process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL];
      const version           = webshop.getVersion();
      
      webshop.logging.LoggingSystem.setMinLogLevel(logLevel);
      
      const info = {
         version:    (typeof version === 'string') ? version : 'not available',
         pathPrefix: pathPrefix,
         start:      (new Date()).toISOString()
      };
      
      LOGGER.logInfo('version = ' + info.version);
      LOGGER.logInfo('log level = ' + logLevel.description);
      LOGGER.logInfo('pathPrefix = ' + pathPrefix);

      return info;
   }
};