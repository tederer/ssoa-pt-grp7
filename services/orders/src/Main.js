/* global webshop, process, __dirname */

require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/database/AzureCosmosDB.js');
require('../../common/src/webserver/Webserver.js');
require('../../common/src/service/BasicEntityOperations.js');
require('../../common/src/MainInitializer.js');
require('./OrderWorker.js');
require('./States.js');

const entityName        = 'order';
const pathPrefix        = '/' + entityName;
const collectionName    = entityName + 's';
const databaseName      = collectionName;

const info     = webshop.MainInitializer.initialize(pathPrefix);
const LOGGER   = webshop.logging.LoggingSystem.createLogger('Main');
const STATES   = webshop.orders.States;

var creationRequestDataValid = function creationRequestDataValid(requestData) {
   var isValid =  (requestData !== undefined)                        &&
                  (typeof requestData.idempotencyKey === 'string')   &&
                  (requestData.idempotencyKey.length > 0)            &&
                  (typeof requestData.customerId === 'string')       &&
                  (requestData.customerId.length > 0)                &&
                  (typeof requestData.cartContent === typeof([]));

   requestData.cartContent.forEach(content => {
      isValid = isValid                                              &&
            (typeof content.productId === 'string')                  &&
            (content.productId.length > 0)                           &&
            (typeof content.quantity === 'number')                   &&
            (content.quantity > 0);
   });

   return isValid;
};

var createEntityDocument = function createEntityDocument(requestData) {
   var document = {
      idempotencyKey:   requestData.idempotencyKey, 
      customerId:       requestData.customerId, 
      cartContent:      [],
      state:            STATES.new.toString(),
   };
   requestData.cartContent.forEach(content => {
      document.cartContent.push({productId: content.productId, quantity: content.quantity});
   });
   return document;
};

var startup = async function startup() {
   var database;

   try {
      database = await(new webshop.database.AzureCosmosDB(databaseName)).open();
      new webshop.orders.OrderWorker(database, collectionName);
   } catch(error) {
      LOGGER.logError('failed to start service: ' + error);
      process.exit(1);
   }

   const webserverSettings = {
      pathPrefix:       pathPrefix, 
      rootFolderPath:   __dirname,
      info:             info
   };
   
   webshop.webserver.Webserver(webserverSettings, app => {

      var settings = {
                        app                        : app,
                        database                   : database,        
                        collectionName             : collectionName,
                        entityName                 : entityName,
                        pathPrefix                 : pathPrefix,
                        creationRequestDataValid   : creationRequestDataValid,
                        createEntityDocument       : createEntityDocument
                     };

      new webshop.service.BasicEntityOperations(settings);
   });
};

startup();