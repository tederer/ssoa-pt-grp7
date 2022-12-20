/* global webshop, assertNamespace, setInterval */

const { Logger } = require('mongodb');

require('../NamespaceUtils.js');

assertNamespace('webshop.service');

webshop.service.IdempotentRequest = function IdempotentRequest(database) {

   const LOGGER                  = webshop.logging.LoggingSystem.createLogger('Idempotency');
   const REMOVAL_INTERVAL_IN_MS  = 60 * 1000;
   const STORAGE_DURATION_IN_MS  = 60 * REMOVAL_INTERVAL_IN_MS;
   const collectionName          = 'processedRequests';
   
   var removeOldRequests = async function removeOldRequests() {
      var deletedCount = await database.deleteMany(collectionName, {timestamp: {$lt: Date.now() - STORAGE_DURATION_IN_MS}});
      if (deletedCount > 0) {
         LOGGER.logInfo('removed ' + deletedCount + ' expired requests');
      }
   };

   /**
    * Checks if a request with the provided idempotency key was processed 
    * in the past and remembers the key of new requests.
    * 
    * returns true if it is a new request, otherwise false
    */
   this.add = async function add(idempotencyKey, entityId, request) {
      var isNew = false;
      var foundRecord = await database.findOne(collectionName, {idempotencyKey: idempotencyKey, entityId: entityId});
      if (foundRecord === null) {
         await database.insert(collectionName, {idempotencyKey: idempotencyKey, entityId: entityId, request: request, timestamp: Date.now()});
         LOGGER.logInfo('added idempotencyKey ' + idempotencyKey + ' for entity ' + entityId);
         isNew = true;
      }
      return isNew;
   };

   /**
    * Returns the record with the provided idempotency key and removes it.
    * 
    * returns an array containing all request found for the provided key
    */
    this.getAndDelete = async function getAndDelete(idempotencyKey) {
      var query        = {idempotencyKey: idempotencyKey};
      var foundRecords = await database.findMany(collectionName, query);
      var requests     = [];

      if (typeof foundRecords === typeof []) {
         foundRecords.forEach(found => requests.push(found.request));
         await database.deleteMany(collectionName, query);
      }
      return requests;
   };

   removeOldRequests();
   setInterval(removeOldRequests, REMOVAL_INTERVAL_IN_MS);
};