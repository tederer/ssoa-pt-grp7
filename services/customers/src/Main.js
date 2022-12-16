/* global webshop, process, __dirname */

require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/database/AzureCosmosDB.js');
require('../../common/src/webserver/Webserver.js');
require('../../common/src/service/BasicEntityOperations.js');
require('../../common/src/MainInitializer.js');
require('./Service.js');

const entityName        = 'customer';
const pathPrefix        = '/' + entityName;
const collectionName    = entityName + 's';
const databaseName      = collectionName;

const info     = webshop.MainInitializer.initialize(pathPrefix);
const LOGGER   = webshop.logging.LoggingSystem.createLogger('Main');

var creationRequestDataValid = function creationRequestDataValid(requestData) {
   return (requestData !== undefined)                                &&
                  (typeof requestData.idempotencyKey === 'string')   &&
                  (requestData.idempotencyKey.length > 0)            &&
                  (typeof requestData.firstname === 'string')        &&
                  (requestData.firstname.length > 0)                 &&
                  (typeof requestData.lastname === 'string')         &&
                  (requestData.lastname.length > 0)                  &&
                  (typeof requestData.credit === 'number')           &&
                  (requestData.credit >= 0);
};

var createEntityDocument = function createEntityDocument(requestData) {
   return {
      idempotencyKey:   requestData.idempotencyKey, 
      firstname:        requestData.firstname,
      lastname:         requestData.lastname,
      credit:           requestData.credit,
      lastModification: Date.now()
   };
};

var startup = async function startup() {
   var service;
   var database;

   try {
      database = await(new webshop.database.AzureCosmosDB(databaseName)).open();
      service  = new webshop.customers.Service(database);
   } catch(error) {
      LOGGER.logError("failed to start service: " + error);
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