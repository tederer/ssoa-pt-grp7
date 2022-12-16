/* global webshop, assertNamespace */

const { Logger } = require('mongodb');

require('../NamespaceUtils.js');

assertNamespace('webshop.service');

webshop.service.Idempotency = function Idempotency(database) {

   const LOGGER                  = webshop.logging.LoggingSystem.createLogger('Idempotency');
   const REMOVAL_INTERVAL_IN_MS  = 60 * 1000;
   const STORAGE_DURATION_IN_MS  = 60 * 60 * 1000;
   const collectionName          = 'processedRequests';
   
   var removeOldRequests = async function removeOldRequests() {
      var deletedCount = await database.deleteMany(collectionName, {timestamp: {$lt: Date.now() - STORAGE_DURATION_IN_MS}});
      if (deletedCount > 0) {
         LOGGER.logInfo('removed ' + deletedCount + ' expired requests');
      }
   };

   this.isNewRequest = async function isNewRequest(idempotencyKey) {
      var isNew = false;
      var foundRecord = await database.findOne(collectionName, {idempotencyKey: idempotencyKey});
      if (foundRecord == null) {
         await database.insert(collectionName, {idempotencyKey: idempotencyKey, timestamp: Date.now()});
         LOGGER.logInfo('added idempotencyKey \"' + idempotencyKey + '\"');
         isNew = true;
      }
      return isNew;
   };

   removeOldRequests();
   setInterval(removeOldRequests, REMOVAL_INTERVAL_IN_MS);
};