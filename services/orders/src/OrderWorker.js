/* global webshop, assertNamespace */

const { ObjectId } = require('mongodb');

require('../../common/src/NamespaceUtils.js');
require('../../common/src/logging/LoggingSystem.js');
require('./States.js');

assertNamespace('webshop.orders');

webshop.orders.OrderWorker = function OrderWorker(database, collectionName) {

   const MAX_ORDER_PROCESSING_DURATION_IN_MS = 10000; // TODO take higher value
   const SLEEP_DURATION_IN_MS                = 1000;
   const LOGGER                              = webshop.logging.LoggingSystem.createLogger('OrderWorker');
   const STATES                              = webshop.orders.States;

   var getOldestNewOrder = async function getOldestNewOrder() {
      var oldestNewOrder = await database.getLongestUnmodified(collectionName, {state: STATES.new.toString()});
      if (oldestNewOrder !== undefined) {
         var orderId       = oldestNewOrder._id;
         var newState      = STATES.inProgress.toString();
         LOGGER.logInfo('setting state of order ' + orderId + ' to ' + newState);
         await database.updateOne(collectionName, {_id:  orderId}, {$set: {'state': newState, lastModification: Date.now()}});
      }
      return oldestNewOrder;
   };

   var resetStateOfExpiredOrdersInProgress = async function resetStateOfExpiredOrdersInProgress() {
      var query = {
         $and: [
            {state:              STATES.inProgress.toString()},
            {lastModification:   {$lt: Date.now() - MAX_ORDER_PROCESSING_DURATION_IN_MS}}
         ]
      };

      var modifiedCount = await database.executeAsTransaction(async function(db) {
         return await db.updateMany(collectionName, query, {$set: {'state': STATES.new.toString(), lastModification: Date.now()}})
      });

      if (modifiedCount > 0) {
         LOGGER.logInfo('reset state for ' + modifiedCount + ' order(s) because they expired');
      }
   };

   var process = async function process(order) {
      LOGGER.logInfo('processing order ' + order._id.toString());
      
      // TODO implement order processing here
      
      var newState = STATES.approved.toString();
      LOGGER.logInfo('setting state of order ' + order._id.toString() + ' to ' + newState);
      await database.updateOne(collectionName, {_id:  order._id}, {$set: {'state': newState, lastModification: Date.now()}});
   };

   var processNextOrder = async function processNextOrder() {
      try {
         var oldestNewOrder;
         while ((oldestNewOrder = await database.executeAsTransaction(getOldestNewOrder)) !== undefined) {
            await process(oldestNewOrder);
         }
         resetStateOfExpiredOrdersInProgress();
      } catch(error) {
         LOGGER.logError(error);
      }
      setTimeout(processNextOrder, SLEEP_DURATION_IN_MS);
   };

   processNextOrder();
};