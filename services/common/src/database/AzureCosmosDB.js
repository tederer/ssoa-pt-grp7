/* global assertNamespace, webshop, process */

require('../NamespaceUtils.js');
require('../logging/LoggingSystem.js');

assertNamespace('webshop.database');

/**
 * MongoDB-wrapper (driver version 4.2) for an Azure Cosmos DB.
 * 
 * query format documentation:
 *    https://www.mongodb.com/docs/manual/core/document/#other-uses-of-the-document-structure
 *    https://www.mongodb.com/docs/manual/reference/operator/query/
 * 
 * update format documentation:
 *    https://www.mongodb.com/docs/manual/reference/operator/update/#update-operators
 */
webshop.database.AzureCosmosDB = function AzureCosmosDB(databaseName) {
	
   const mongodb = require('mongodb');
   const LOGGER  = webshop.logging.LoggingSystem.createLogger('AzureCosmosDB');
   
   var mongoClient;
	var database;
   var indices = {};

   var assertConnected = function assertConnected(operationName) {
      if (mongoClient === undefined) {
         throw 'not connected to database -> cannot execute \"' + operationName + '\" operation';
      }
   };

   /**
    * Inserts the provided document into the collection.
    * 
    * returns the ID of the inserted document
    */
   this.insert = async function insert(collectionName, document) {
      LOGGER.logDebug('inserting into collection "' + collectionName + '": ' + JSON.stringify(document));
      assertConnected('insert');
      return (await database.collection(collectionName).insertOne(document)).insertedId;
   };

   /**
    * Returns the first document matching the query or null of nothing matches the query.
    */
   this.findOne = async function findOne(collectionName, query) {
      LOGGER.logDebug('find one document in collection "' + collectionName + '" (query=' + JSON.stringify(query) + ')');
      assertConnected('findOne');
      return database.collection(collectionName).findOne(query);
   };

   /**
    * Deletes the first document matching the query.
    * 
    * returns the number of deleted documents
    */
   this.deleteOne = async function deleteOne(collectionName, query) {
      LOGGER.logDebug('delete one document in collection "' + collectionName + '" (query=' + JSON.stringify(query) + ')');
      assertConnected('findOne');
      return (await database.collection(collectionName).deleteOne(query)).deletedCount;
   };

   /**
    * Deletes all documents matching the query.
    * 
    * returns the number of deleted documents
    */
   this.deleteMany = async function deleteMany(collectionName, query) {
      LOGGER.logDebug('delete many document in collection "' + collectionName + '" (query=' + JSON.stringify(query) + ')');
      assertConnected('deleteMany');
      return (await database.collection(collectionName).deleteMany(query)).deletedCount;
   };

   /**
    * Updates the first document matching the query.
    * 
    * returns the number of modified documents
    */
    this.updateOne = async function updateOne(collectionName, query, update) {
      LOGGER.logDebug('update one document in collection "' + collectionName + '" (query=' + JSON.stringify(query) + ', update=' + JSON.stringify(update) + ')');
      return (await database.collection(collectionName).updateOne(query, update)).modifiedCount;
   };

   /**
    * Updates all documents matching the query.
    * 
    * returns the number of modified documents
    */
    this.updateMany = async function updateMany(collectionName, query, update) {
      LOGGER.logDebug('update many documents in collection "' + collectionName + '" (query=' + JSON.stringify(query) + ', update=' + JSON.stringify(update) + ')');
      return (await database.collection(collectionName).updateMany(query, update)).modifiedCount;
   };

   /**
    * Returns an array containing the ID of each document in the collection
    */
   this.getAllIds = async function getAllIds(collectionName) {
      LOGGER.logDebug('return all IDs in collection "' + collectionName + '"');
      assertConnected('getAllIds');
      return database.collection(collectionName).find().map(doc => doc._id.toString()).toArray();
   };

   /**
    * Queries the longest unmodified document matching the provided query. This method requires 
    * that each document in the collection has a lastModification field (milliseconds elapsed since the epoch).
    * 
    * returns the document or undefined if no document matches the query
    */
   this.getLongestUnmodified = async function getLongestUnmodified(collectionName, query) {
      const ASCENDING  = 1;
      
      var collection = database.collection(collectionName);

      if (indices[collectionName] === undefined) {
         LOGGER.logDebug('creating combined index for \"lastModification\" and \"_id\" in collection \"' + collectionName + '\"');
         indices[collectionName] = await collection.createIndex({ lastModification: ASCENDING, _id: ASCENDING });
      }

      var result = await collection.aggregate([
         { $match:   query },
         { $sort:    { lastModification: ASCENDING, _id: ASCENDING } },
         { $limit:   1 }
      ]).toArray();

      return (result.length > 0) ? result[0] : undefined;
   };

   /**
    * Executes the provided operations as a transaction. 
    * operations is a function receiving the database instance.
    * 
    * returns the result of the provided operations
    */
   this.executeAsTransaction = async function executeAsTransaction(operations) {
      assertConnected('executeAsTransaction');

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
   };

   /**
    * Opens the database. Takes the database connection string from the 
    * environment variable "DATABASE_CONNECTION_STRING".
    */
   this.open = async function open() {
      if (mongoClient === undefined) {
         var connectionString = process.env.DATABASE_CONNECTION_STRING;
         if (typeof connectionString !== 'string' || connectionString.length <= 0) {
            throw 'invalid database connection string "' + connectionString + '"';
         } 

         LOGGER.logInfo('connecting to database \"' + databaseName + '\"...');
         
         try {
            mongoClient = await (new mongodb.MongoClient(connectionString)).connect();
            database    = mongoClient.db(databaseName);
            LOGGER.logInfo('connection established');
            return this;
         } catch(e) {
            throw 'failed to open database connection: ' + e;
         }
      }
   };

   /**
    * Close the database and its underlying connections.
    */
   this.close = async function close() {
      if (mongoClient !== undefined) {
         LOGGER.logInfo('closing database ...');
         await mongoClient.close();
         mongoClient = undefined;
         database    = undefined;
         LOGGER.logInfo('connection closed');
      }
   };
};
