/* global webshop, assertNamespace */

require('../../common/src/NamespaceUtils.js');
require('../../common/src/webserver/Webserver.js');
require('../../common/src/service/Idempotency.js');

assertNamespace('webshop.customers');

webshop.customers.IncrementOperation = function IncrementOperation(settings) {
   
   const LOGGER                   = webshop.logging.LoggingSystem.createLogger('IncrementOperation');
   const RESPONSE                 = webshop.webserver.HttpResponses;
   const { ObjectId }             = require('mongodb');
   const app                      = settings.app;
   const database                 = settings.database; 
   const collectionName           = settings.collectionName; 
   const pathPrefix               = settings.pathPrefix;
   const idempotencyChecker       = new webshop.service.Idempotency(database);

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

   var incrementCredit = async function incrementCredit(requestData) {
      LOGGER.logDebug('increment credit (requestData=' + JSON.stringify(requestData) + ')');
      assertDatabaseConnected();
      assertValidRequestData(requestData);
         
      return database.executeAsTransaction(async function(db) {
         var modifiedCount = 0;
         var queryById     = {_id: ObjectId(requestData.customerId)};
         var increment     = requestData.increment;

         if (await idempotencyChecker.isNewRequest(requestData.idempotencyKey)) {
            var product = await database.findOne(collectionName, queryById);
            if (product !== null) {
               if (product.quantity + increment < 0) {
                  throw 'cannot increment credit of ' + product._id.toString() + ' by ' + increment + ' because credit will be negative';
               } 
               
               modifiedCount = await db.updateOne(collectionName, queryById, {$inc: {credit: increment}});
               await db.updateOne(collectionName, queryById, {$set: {lastModification: Date.now()}});
            }
         }
         return modifiedCount;
      });
   };
   
   app.post(pathPrefix + '/credit', (request, response) => {
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
};