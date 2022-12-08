/* global assertNamespace, webshop, process */

require('./Database.js');
require('../NamespaceUtils.js');
require('../logging/LoggingSystem.js');

assertNamespace('webshop.database');

webshop.database.AzureCosmosDB = function AzureCosmosDB(databaseName) {
	
   var mongodb          = require('mongodb');
   var LOGGER           = webshop.logging.LoggingSystem.createLogger('AzureCosmosDB');
   var connected        = false;
   var connectionString = process.env.DATABASE_CONNECTION_STRING;
   var mongoClient;
	var database;

   var assertConnected = function assertConnected(operationName) {
      if (!connected) {
         throw 'not connected to database -> cannot execute ' + operationName + 'operation';
      }
   };

   this.insert = async function insert(collectionName, document) {
      LOGGER.logInfo('inserting into collection "' + collectionName + '": ' + JSON.stringify(document));
      assertConnected('insert');
      return await database.collection(collectionName).insertOne(document);
   };

   this.findOne = async function findOne(collectionName, query) {
      LOGGER.logInfo('find one document in collection "' + collectionName + '" (query=' + JSON.stringify(query) + ')');
      assertConnected('findOne');
      return await database.collection(collectionName).findOne(query);
   };

   this.executeAsTransaction = async function executeAsTransaction(operations) {
      if (connected) {
         var transactionOptions = {
            readConcern:      { level: 'snapshot' },
            writeConcern:     { w: 'majority' },
            readPreference:   'primary'
         };

         var session = mongoClient.startSession();
         var error;
         var result;

         try {
            session.startTransaction(transactionOptions);
            result = await operations(this);
            await session.commitTransaction();
         } catch(e) {
            error = e;
            await session.abortTransaction();
         } finally {
            await session.endSession();
         }

         if (error !== undefined) {
            throw error;
         }

         return result;
      }
   };

   this.open = async function open() {
      if (!connected) {
         if (typeof connectionString !== 'string' || connectionString.length <= 0) {
            throw {message: 'invalid connection string "' + connectionString + '"', tryAgain: false};
         } 

         LOGGER.logInfo('connecting to database ...');
         
         try {
            mongoClient = new mongodb.MongoClient(connectionString);
            await mongoClient.connect();
            database = mongoClient.db(databaseName);
            connected = true;
            LOGGER.logInfo('connection established');
            return this;
         } catch(e) {
            throw {message: 'failed to open connection: ' + e, tryAgain: true};
         }
      }
   };

   this.close = async function close() {
      if (connected) {
         LOGGER.logInfo('closing database ...');
         await mongoClient.close();
         connected = false;
         LOGGER.logInfo('connection closed');
      } else {
         LOGGER.logDebug('ignoring request to close database because it\'s already disconnected');
      }
   };
};

webshop.database.AzureCosmosDB.prototype = new webshop.database.Database();