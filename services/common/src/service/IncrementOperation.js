/* global webshop, assertNamespace */

require('../NamespaceUtils.js');
require('../../src/webserver/HttpResponses.js');
require('../../src/service/IdempotentRequest.js');

assertNamespace('webshop.service');

webshop.service.IncrementOperation = function IncrementOperation(settings) {
   
   const LOGGER                 = webshop.logging.LoggingSystem.createLogger('IncrementOperation');
   const RESPONSE               = webshop.webserver.HttpResponses;
   const { ObjectId }           = require('mongodb');
   const app                    = settings.app;
   const database               = settings.database; 
   const pathPrefix             = settings.pathPrefix;
   const entityName             = settings.entityName;
   const idempotentRequest      = new webshop.service.IdempotentRequest(database);
   const idFieldName            = entityName + 'Id';
   const nameOfFieldToIncrement = settings.nameOfFieldToIncrement;

   var assertDatabaseConnected = function assertDatabaseConnected() {
      if (database === undefined) {
         throw 'database not (yet) connected -> cannot execute operatation (Did you forget to call the start-method?)';
      }
   };

   var assertValidRequestData = function assertValidRequestData(requestData) {
      var isValid = (requestData !== undefined)          &&
      (typeof requestData.idempotencyKey === 'string')   &&
      (requestData.idempotencyKey.length > 0)            &&
      (typeof requestData[idFieldName]   === 'string')   &&
      (requestData[idFieldName].length   > 0)            &&
      (typeof requestData.increment      === 'number');

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

   var createUpdateQuery = function createUpdateQuery(fieldName, value) {
      var inner = {};
      inner[fieldName] = value;
      return {$inc: inner};
   };

   var increment = async function increment(requestData) {
      LOGGER.logDebug('increment ' + nameOfFieldToIncrement + ' (requestData=' + JSON.stringify(requestData) + ')');
      assertDatabaseConnected();
      assertValidRequestData(requestData);
         
      return database.executeAsTransaction(async db => {
         var modifiedCount = 0;
         var queryById     = {_id: ObjectId(requestData[idFieldName])};
         var increment     = requestData.increment;

         if (await idempotentRequest.add(requestData.idempotencyKey, requestData[idFieldName], requestData, db)) {
            var entity = await db.findOne(queryById);
            if (entity !== null) {
               if (entity[nameOfFieldToIncrement] + increment < 0) {
                  throw 'cannot increment ' + nameOfFieldToIncrement + ' of ' + entity._id.toString() + ' by ' + increment + ' because ' + nameOfFieldToIncrement + ' will be negative';
               } 
               modifiedCount = await db.updateOne(queryById, createUpdateQuery(nameOfFieldToIncrement, increment));
               await db.updateOne(queryById, {$set: {lastModification: Date.now()}});
            }
         }
         return modifiedCount;
      });
   };

   var undoIncrement = async function undoIncrement(requestData) {
      LOGGER.logDebug('undo increment ' + nameOfFieldToIncrement + ' (requestData=' + JSON.stringify(requestData) + ')');
      assertDatabaseConnected();
      assertValidUndoRequestData(requestData);
         
      return database.executeAsTransaction(async db => {
         var modifiedCount = 0;
         var requests      = await idempotentRequest.getAndDelete(requestData.idempotencyKey, db);
         
         for (var i = 0; i < requests.length; i++) {
            var request   = requests[i];
            var queryById = {_id: ObjectId(request[idFieldName])};
            var entity    = await db.findOne(queryById);
            if (entity !== null) {
               modifiedCount = await db.updateOne(queryById, createUpdateQuery(nameOfFieldToIncrement, -request.increment));
               await db.updateOne(queryById, {$set: {lastModification: Date.now()}});
            }
         }
         return modifiedCount;
      });
   };
   
   app.post(pathPrefix + '/' + nameOfFieldToIncrement + '/increment', (request, response) => {
      LOGGER.logDebug(request.method + ' request [path: ' + request.path + ']');
      var requestData = request.body;
      increment(requestData)
         .then(modifiedCount => {
            if (modifiedCount > 0) {
               LOGGER.logInfo('incremented ' + entityName + ' (id=' + requestData[idFieldName] + ',increment=' + requestData.increment + ')');
            }
            response.status(RESPONSE.OK).end();
         })
         .catch(error => {
            LOGGER.logError('failed to increment ' + entityName + ' (idempotencyKey=' + requestData.idempotencyKey + '): ' + error);
            response.status(RESPONSE.BAD_REQUEST).end();
         });
   });   
   
   app.delete(pathPrefix + '/' + nameOfFieldToIncrement + '/increment', (request, response) => {
      LOGGER.logDebug(request.method + ' request [path: ' + request.path + ']');
      var requestData = request.body;
      undoIncrement(requestData)
         .then(modifiedCount => {
            if (modifiedCount > 0) {
               LOGGER.logInfo('undo performed for increment ' + entityName + ' operation (idempotencyKey=' + requestData.idempotencyKey + ')');
            }
            response.status(RESPONSE.OK).end();
         })
         .catch(error => {
            LOGGER.logError('failed to undo increment ' + entityName + ' operation (idempotencyKey=' + requestData.idempotencyKey + '): ' + error);
            response.status(RESPONSE.BAD_REQUEST).end();
         });
   });   
};