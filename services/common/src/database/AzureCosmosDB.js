/* global assertNamespace, webshop, process */

require('../NamespaceUtils.js');
require('../logging/LoggingSystem.js');
require('../AppConfiguration.js');

assertNamespace('webshop.database');

/**
 * MongoDB-wrapper (driver version 4.2) for an Azure Cosmos DB.
 * 
 * documentation:
 *    API            https://mongodb.github.io/node-mongodb-native/4.2/ 
 * 
 *    transactions:  https://www.mongodb.com/docs/v4.2/core/transactions/
 *                   https://www.mongodb.com/docs/drivers/node/v4.2/fundamentals/transactions/
 *                   https://www.mongodb.com/docs/v4.2/core/transactions-operations/#transactions-operations-crud
 * 
 *    query format:  https://www.mongodb.com/docs/manual/core/document/#other-uses-of-the-document-structure
 *                   https://www.mongodb.com/docs/manual/reference/operator/query/
 * 
 *    update format: https://www.mongodb.com/docs/manual/reference/operator/update/#update-operators
 * 
 * Specifying the collectionName is necessary because in MongoDB 4.2 collections cannot get created
 * implicitly in a transaction, they have to get created before using them. MongoDB supports implicit
 * collection creation starting with 4.4 but currently Azure's "newest" version is 4.2.
 * 
 * Only one collection is supported because transactions over documents in different collections did not
 * work in MongoDB 4.2 and that's the latest version in Azure.
 */
webshop.database.AzureCosmosDB = function AzureCosmosDB(databaseName, collectionName) {
	
   const mongodb     = require('mongodb');
   const LOGGER      = webshop.logging.LoggingSystem.createLogger('AzureCosmosDB');
   const NO_SESSION  = undefined;
   const ENTITY      = 'entity';

   var mongoClient;
	var database;
   var indices = {};
            
   var assertConnected = function assertConnected(operationName) {
      if (mongoClient === undefined) {
         throw 'not connected to database -> cannot execute \"' + operationName + '\" operation';
      }
   };

   var createOptions = function createOptions(session) {
      return (session === undefined) ? undefined : {session: session};
   };
   
   var insertImpl = async function insertImpl(session, document) {
      LOGGER.logDebug('inserting : ' + JSON.stringify(document));
      assertConnected('insert');
      return (await database.collection(collectionName).insertOne(document, createOptions(session))).insertedId;
   };

   var findOneImpl = async function findOneImpl(session, query) {
      LOGGER.logDebug('find one document (query=' + JSON.stringify(query) + ')');
      assertConnected('findOne');
      return await database.collection(collectionName).findOne(query, createOptions(session));
   };

   var findManyImpl = async function findManyImpl(session, query) {
      LOGGER.logDebug('find many documents (query=' + JSON.stringify(query) + ')');
      assertConnected('findMany');
      return database.collection(collectionName).find(query, createOptions(session)).toArray();
   };

   var deleteOneImpl = async function deleteOneImpl(session, query) {
      LOGGER.logDebug('delete one document (query=' + JSON.stringify(query) + ')');
      assertConnected('deleteOne');
      return (await database.collection(collectionName).deleteOne(query, createOptions(session))).deletedCount;
   };

   var deleteManyImpl = async function deleteManyImpl(session, query) {
      LOGGER.logDebug('delete many documents (query=' + JSON.stringify(query) + ')');
      assertConnected('deleteMany');
      return (await database.collection(collectionName).deleteMany(query, createOptions(session))).deletedCount;
   };

   var updateOneImpl = async function updateOneImpl(session, query, update) {
      LOGGER.logDebug('update one document (query=' + JSON.stringify(query) + ', update=' + JSON.stringify(update) + ')');
      assertConnected('updateOneImpl');
      return (await database.collection(collectionName).updateOne(query, update, createOptions(session))).modifiedCount;
   };

   var updateManyImpl = async function updateManyImpl(session, query, update) {
      LOGGER.logDebug('update many documents (query=' + JSON.stringify(query) + ', update=' + JSON.stringify(update) + ')');
      assertConnected('updateManyImpl');
      return (await database.collection(collectionName).updateMany(query, update, createOptions(session))).modifiedCount;
   };

   var getAllEntityIdsImpl = async function getAllEntityIdsImpl(session) {
      LOGGER.logDebug('return all IDs');
      assertConnected('getAllEntityIds');
      return database.collection(collectionName).find({type: ENTITY}, createOptions(session)).map(doc => doc._id.toString()).toArray();
   };

   var getLongestUnmodifiedImpl = async function getLongestUnmodifiedImpl(session, query) {
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
      ], createOptions(session)).toArray();

      return (result.length > 0) ? result[0] : undefined;
   };

   /**
    * Inserts the provided document into the collection.
    * 
    * returns the ID of the inserted document
    */
   this.insert = async function insert(document) {
      return insertImpl(NO_SESSION, document);
   };

   /**
    * Returns the first document matching the query or null of nothing matches the query.
    */
   this.findOne = async function findOne(query) {
      return findOneImpl(NO_SESSION, query);
   };

   /**
    * Returns an array containing all documents matching the query.
    */
   this.findMany = async function findMany(query) {
      return findManyImpl(NO_SESSION, query);
   };

   /**
    * Deletes the first document matching the query.
    * 
    * returns the number of deleted documents
    */
   this.deleteOne = async function deleteOne(query) {
      return deleteOneImpl(NO_SESSION, query);
   };

   /**
    * Deletes all documents matching the query.
    * 
    * returns the number of deleted documents
    */
   this.deleteMany = async function deleteMany(query) {
      return deleteManyImpl(NO_SESSION, query);
   };

   /**
    * Updates the first document matching the query.
    * 
    * returns the number of modified documents
    */
   this.updateOne = async function updateOne(query, update) {
      return updateOneImpl(NO_SESSION, query, update);
   };

   /**
    * Updates all documents matching the query.
    * 
    * returns the number of modified documents
    */
   this.updateMany = async function updateMany(query, update) {
      return updateManyImpl(NO_SESSION, query, update);
   };

   /**
    * Returns an array containing the ID of each document in the collection
    */
   this.getAllEntityIds = async function getAllEntityIds() {
      return getAllEntityIdsImpl(NO_SESSION);
   };

   /**
    * Queries the longest unmodified document matching the provided query. This method requires 
    * that each document in the collection has a lastModification field (milliseconds elapsed since the epoch).
    * 
    * returns the document or undefined if no document matches the query
    */
   this.getLongestUnmodified = async function getLongestUnmodified(query) {
      return getLongestUnmodifiedImpl(NO_SESSION, query);
   };

   var createProxy = function createProxy(session) {
      return {
         insert              : insertImpl.bind(this, session),
         findOne             : findOneImpl.bind(this, session),
         findMany            : findManyImpl.bind(this, session),
         deleteOne           : deleteOneImpl.bind(this, session),
         deleteMany          : deleteManyImpl.bind(this, session),
         updateOne           : updateOneImpl.bind(this, session),
         updateMany          : updateManyImpl.bind(this, session),
         getAllEntityIds           : getAllEntityIdsImpl.bind(this, session),
         getLongestUnmodified: getLongestUnmodifiedImpl.bind(this, session)
      };
   };

   /**
    * Executes the provided operations as a transaction. 
    * operations is a function receiving the database instance.
    * 
    * returns the result of the provided operations
    */
   this.executeAsTransaction = async function executeAsTransaction(operations) {
      assertConnected('executeAsTransaction');
      var result;
      var session;

      try {
         session = mongoClient.startSession();
         await session.withTransaction(async () => {
            result = await operations(createProxy(session));
            return result;
         });
      }
      finally {
         var currentSession = session;
         session = undefined;
         await currentSession.endSession();
      }
      return result;
   };

   /**
    * Opens the database. Takes the database connection string from the 
    * environment variable "DATABASE_CONNECTION_STRING".
    */
   this.open = async function open() {
      if (mongoClient === undefined) {
         const appConfig = new webshop.AppConfiguration(process.env.APP_CONFIG_CONNECTION_STRING);
         var connectionString = await appConfig.get('DATABASE_CONNECTION_STRING');
         if (typeof connectionString !== 'string' || connectionString.length === 0) {
            throw 'invalid database connection string "' + connectionString + '"';
         } 

         LOGGER.logInfo('connecting to database \"' + databaseName + '\"...');
         
         try {
            mongoClient = await (new mongodb.MongoClient(connectionString)).connect();
            database    = mongoClient.db(databaseName);
            LOGGER.logInfo('connection established');

            var existingCollectionNames = await database.listCollections({}).map(doc => doc.name).toArray();
            if (existingCollectionNames.indexOf(collectionName) === -1) {
               await database.createCollection(collectionName);
               LOGGER.logInfo('created collection \"' + collectionName + '\"');
            }
            
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
