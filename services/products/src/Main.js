/* global webshop, process, __dirname */

require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/database/AzureCosmosDB.js');
require('../../common/src/webserver/Webserver.js');
require('../../common/src/service/BasicEntityOperations.js');
require('../../common/src/MainInitializer.js');
require('./IncrementOperation.js');

const entityName        = 'product';
const pathPrefix        = '/' + entityName;
const collectionName    = entityName + 's';
const databaseName      = collectionName;

const info     = webshop.MainInitializer.initialize(pathPrefix);
const LOGGER   = webshop.logging.LoggingSystem.createLogger('Main');

var creationRequestDataValid = function creationRequestDataValid(requestData) {
   return   (requestData !== undefined)                        &&
            (typeof requestData.idempotencyKey === 'string')   &&
            (requestData.idempotencyKey.length > 0)            &&
            (typeof requestData.name === 'string')             &&
            (requestData.name.length > 0)                      &&
            (typeof requestData.price === 'number')            &&
            (requestData.price >= 0)                           &&
            (typeof requestData.quantity === 'number')         &&
            (requestData.quantity >= 0);
};

var createEntityDocument = function createEntityDocument(requestData) {
   var document = {
      idempotencyKey:   requestData.idempotencyKey, 
      name:             requestData.name, 
      price:            requestData.price,
      quantity:         requestData.quantity,
   };
   return document;
};

var startup = async function startup() {
   var database;

   try {
      database = await(new webshop.database.AzureCosmosDB(databaseName)).open();
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
      new webshop.products.IncrementOperation(settings);
   });
};

startup();