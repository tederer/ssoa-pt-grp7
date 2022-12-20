/* global webshop, assertNamespace */

require('../../common/src/NamespaceUtils.js');
require('../../common/src/webserver/Webserver.js');
require('../../common/src/service/IdempotentRequest.js');

assertNamespace('webshop.customers');

webshop.customers.IncrementOperation = function IncrementOperation(settings) {
   
   const LOGGER                   = webshop.logging.LoggingSystem.createLogger('IncrementOperation');
   const RESPONSE                 = webshop.webserver.HttpResponses;
   const { ObjectId }             = require('mongodb');
   const app                      = settings.app;
   const database                 = settings.database; 
   const collectionName           = settings.collectionName; 
   const pathPrefix               = settings.pathPrefix;
   const idempotentRequest       = new webshop.service.IdempotentRequest(database);

   var assertDatabaseConnected = function assertDatabaseConnected() {
      if (database === undefined) {
         throw 'database not (yet) connected -> cannot execute operatation (Did you forget to call the start-method?)';
      }
   };

   var assertValidRequestData = function assertValidRequestData(requestData) {
      var isValid = (requestData !== undefined)          &&
      (typeof requestData.idempotencyKey === 'string')   &&
      (requestData.idempotencyKey.length > 0)            &&
      (typeof requestData.customerId === 'string')       &&
      (requestData.customerId.length > 0)                &&
      (typeof requestData.increment === 'number');

      if(!isValid) {
         throw 'invalid request data';
      }
   };

   var assertValidUndoRequestData = function assertValidUndoRequestData(requestData) {
      var isValid = (requestData !== undefined)          &&
      (typeof requestData.idempotencyKey === 'string')   &&
      (requestData.idempotencyKey.length > 0);

      if(!isValid) {
         throw 'invalid request data';
      }
   };

   var incrementCredit = async function incrementCredit(requestData) {
      LOGGER.logDebug('increment credit (requestData=' + JSON.stringify(requestData) + ')');
      assertDatabaseConnected();
      assertValidRequestData(requestData);
         
      return database.executeAsTransaction(async function(db) {
         var modifiedCount = 0;
         var queryById     = {_id: ObjectId(requestData.customerId)};
         var increment     = requestData.increment;

         if (await idempotentRequest.add(requestData.idempotencyKey, requestData)) {
            var customer = await database.findOne(collectionName, queryById);
            if (customer !== null) {
               if (customer.credit + increment < 0) {
                  throw 'cannot increment credit of ' + customer._id.toString() + ' by ' + increment + ' because credit will be negative';
               } 
               
               modifiedCount = await db.updateOne(collectionName, queryById, {$inc: {credit: increment}});
               await db.updateOne(collectionName, queryById, {$set: {lastModification: Date.now()}});
            }
         }
         return modifiedCount;
      });
   };

   var undoIncrementCredit = async function undoIncrementCredit(requestData) {
      LOGGER.logDebug('undo increment credit (requestData=' + JSON.stringify(requestData) + ')');
      assertDatabaseConnected();
      assertValidUndoRequestData(requestData);
         
      return database.executeAsTransaction(async function(db) {
         var modifiedCount = 0;
         var request       = await idempotentRequest.getAndDelete(requestData.idempotencyKey);
         
         if (request !== null) {
            var queryById = {_id: ObjectId(request.customerId)};
            var customer  = await database.findOne(collectionName, queryById);
            if (customer !== null) {
               modifiedCount = await db.updateOne(collectionName, queryById, {$inc: {credit: -request.increment}});
               await db.updateOne(collectionName, queryById, {$set: {lastModification: Date.now()}});
            }
         }
         return modifiedCount;
      });
   };
   
   app.post(pathPrefix + '/credit/increment', (request, response) => {
      LOGGER.logDebug(request.method + ' request [path: ' + request.path + ']');
      var requestData = request.body;
      incrementCredit(requestData)
         .then(modifiedCount => {
            if (modifiedCount > 0) {
               LOGGER.logInfo('incremented credit (id=' + requestData.customerId + ',increment=' + requestData.increment + ')');
            }
            response.status(RESPONSE.OK).end();
         })
         .catch(error => {
            LOGGER.logError('failed to increment credit (idempotencyKey=' + requestData.idempotencyKey + '): ' + error);
            response.status(RESPONSE.BAD_REQUEST).end();
         });
   });   
   
   app.delete(pathPrefix + '/credit/increment', (request, response) => {
      LOGGER.logDebug(request.method + ' request [path: ' + request.path + ']');
      var requestData = request.body;
      undoIncrementCredit(requestData)
         .then(modifiedCount => {
            if (modifiedCount > 0) {
               LOGGER.logInfo('undo performed for incremented credit operation (idempotencyKey=' + requestData.idempotencyKey + ')');
            }
            response.status(RESPONSE.OK).end();
         })
         .catch(error => {
            LOGGER.logError('failed to undo increment credit operation (idempotencyKey=' + requestData.idempotencyKey + '): ' + error);
            response.status(RESPONSE.BAD_REQUEST).end();
         });
   });   
};