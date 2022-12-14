/* global webshop, assertNamespace, setInterval */

const { Logger } = require('mongodb');

require('../NamespaceUtils.js');

assertNamespace('webshop.service');

webshop.service.IdempotentRequest = function IdempotentRequest(database) {

   const LOGGER                  = webshop.logging.LoggingSystem.createLogger('IdempotentRequest');
   const REMOVAL_INTERVAL_IN_MS  = 60 * 1000;
   const STORAGE_DURATION_IN_MS  = 60 * REMOVAL_INTERVAL_IN_MS;
   const REQUEST                 = 'idempotentRequest';

   var removeOldRequests = async function removeOldRequests() {
      var deletedCount = await database.deleteMany({type: REQUEST, timestamp: {$lt: Date.now() - STORAGE_DURATION_IN_MS}});
      if (deletedCount > 0) {
         LOGGER.logInfo('removed ' + deletedCount + ' expired requests');
      }
   };

   /**
    * Checks if a request with the provided idempotency key was processed 
    * in the past and remembers the key of new requests.
    * 
    * databaseInTransaction needs to get provided when the method invocation happens 
    * in context of a transaction, otherwise it can be undefined.
    * 
    * returns true if it is a new request, otherwise false
    */
   this.add = async function add(idempotencyKey, entityId, request, databaseInTransaction) {
      var isNew       = false;
      var db          = databaseInTransaction ?? database;
      var foundRecord = await db.findOne({type: REQUEST, idempotencyKey: idempotencyKey, entityId: entityId});

      if (foundRecord === null) {
         await db.insert({type: REQUEST, idempotencyKey: idempotencyKey, entityId: entityId, request: request, timestamp: Date.now()});
         LOGGER.logInfo('added idempotentRequest for entity ' + entityId);
         isNew = true;
      }
      return isNew;
   };

   /**
    * Returns the record with the provided idempotency key and removes it.
    * 
    * databaseInTransaction needs to get provided when the method invocation happens 
    * in context of a transaction, otherwise it can be undefined.
    * 
    * returns an array containing all request found for the provided key
    */
    this.getAndDelete = async function getAndDelete(idempotencyKey, databaseInTransaction) {
      var query        = {type: REQUEST, idempotencyKey: idempotencyKey};
      var db           = databaseInTransaction ?? database;
      var foundRecords = await db.findMany(query);
      var requests     = [];

      if (typeof foundRecords === typeof []) {
         foundRecords.forEach(found => requests.push(found.request));
         await db.deleteMany(query);
      }
      return requests;
   };

   removeOldRequests();
   setInterval(removeOldRequests, REMOVAL_INTERVAL_IN_MS);
};