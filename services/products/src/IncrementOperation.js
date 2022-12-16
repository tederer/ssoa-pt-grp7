/* global webshop, assertNamespace */

require('../../common/src/NamespaceUtils.js');
require('../../common/src/webserver/Webserver.js');
require('../../common/src/service/Idempotency.js');

assertNamespace('webshop.products');

webshop.products.IncrementOperation = function IncrementOperation(settings) {
   
   const LOGGER                   = webshop.logging.LoggingSystem.createLogger('IncrementOperation');
   const RESPONSE                 = webshop.webserver.HttpResponses;
   const { ObjectId }             = require('mongodb');
   const app                      = settings.app;
   const database                 = settings.database; 
   const collectionName           = settings.collectionName; 
   const entityName               = settings.entityName;
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
      (typeof requestData.productId === 'string')        &&
      (requestData.productId.length > 0)                 &&
      (typeof requestData.increment === 'number');

      if(!isValid) {
         throw 'invalid request data';
      }
   };

   var incrementQuantity = async function incrementQuantity(requestData) {
      LOGGER.logDebug('increment quantity (requestData=' + JSON.stringify(requestData) + ')');
      assertDatabaseConnected();
      assertValidRequestData(requestData);
         
      return database.executeAsTransaction(async function(db) {
         var modifiedCount = 0;
         var queryById     = {_id: ObjectId(requestData.productId)};
         var increment     = requestData.increment;

         if (await idempotencyChecker.isNewRequest(requestData.idempotencyKey)) {
            var product = await database.findOne(collectionName, queryById);
            if (product !== null) {
               if (product.quantity + increment < 0) {
                  throw 'cannot increment quantity of ' + product._id.toString() + ' by ' + increment + ' because quantity will be negative';
               } else {
                  modifiedCount = await db.updateOne(collectionName, queryById, {$inc: {quantity: increment}});
                  await db.updateOne(collectionName, queryById, {$set: {lastModification: Date.now()}});
               }
            }
         }
         return modifiedCount;
      });
   };
   
   app.post(pathPrefix + '/quantity', (request, response) => {
      LOGGER.logDebug(request.method + ' request [path: ' + request.path + ']');
      var requestData = request.body;
      incrementQuantity(requestData)
         .then(modifiedCount => {
            if (modifiedCount > 0) {
               LOGGER.logInfo('incremented quantity (id=' + requestData.productId + ',increment=' + requestData.increment + ')');
            }
            response.status(RESPONSE.OK).end();
         })
         .catch(error => {
            LOGGER.logError('failed to increment quantity (idempotencyKey=' + requestData.idempotencyKey + '): ' + error);
            response.status(RESPONSE.BAD_REQUEST).end();
         });
   });   
};