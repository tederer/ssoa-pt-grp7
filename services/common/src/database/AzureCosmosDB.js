/* global assertNamespace, webshop */

require('./Database.js');
require('../NamespaceUtils.js');
require('../logging/LoggingSystem.js');

assertNamespace('webshop.database');

webshop.database.AzureCosmosDB = function AzureCosmosDB(connectionUri, databaseName) {
	
   var mongodb = require('mongodb');
   var LOGGER = webshop.logging.LoggingSystem.createLogger('AzureCosmosDB');
   var mongoClient;
	var connected = false;

   var resolvedPromise = function resolvedPromise() {
      return new Promise((resolve, reject) => resolve());
   };

   this.insert = function insert(collectionName, document) {
      if (connected) {
         LOGGER.logInfo('inserting into collection "' + collectionName + '": ' + JSON.stringify(document));
         return mongoClient.db(databaseName).collection(collectionName).insertOne(document);
      }
   };

   this.open = function open() {
      if (!connected) {
         return new Promise((resolve, reject) => {
            LOGGER.logInfo('opening connection to database ...');
            mongoClient = new mongodb.MongoClient(connectionUri);
            mongoClient.connect()
               .then(() => {
                  connected = true;
                  LOGGER.logInfo('connection established');
                  resolve();
               })
               .catch(e => reject(e));
         });
      } else {
         LOGGER.logDebug('ignoring request to open database because it\'s already connected');
         return resolvedPromise();
      }
   };

   this.close = function close() {
      if (connected) {
         return new Promise((resolve, reject) => {
            LOGGER.logInfo('closing database ...');
            return mongoClient.close()
               .then(() => {
                  connected = false;
                  LOGGER.logInfo('connection closed');
                  resolve();
               })
               .catch( e => reject(e));
         });
      } else {
         LOGGER.logDebug('ignoring request to close database because it\'s already disconnected');
         return resolvedPromise();
      }
   };
};

webshop.database.AzureCosmosDB.prototype = new webshop.database.Database();