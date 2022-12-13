/* global webshop, assertNamespace, setTimeout, process */

const { request }  = require('express');
const { ObjectId } = require('mongodb');

require('../../common/src/NamespaceUtils.js');
require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/database/AzureCosmosDB.js');
require('./States.js');
require('./OrderWorker.js');

assertNamespace('webshop.orders');

webshop.orders.Service = function Service() {

   const LOGGER            = webshop.logging.LoggingSystem.createLogger('Service');
   const COLLECTION_NAME   = 'orders';
   const STATES            = webshop.orders.States;

   var database;

   var assertDatabaseConnected = function assertDatabaseConnected() {
      if (database === undefined) {
         throw 'database not (yet) connected -> cannot execute operatation (Did you forget to call the start-method?)';
      }
   };

   var assertValidOrderId = function assertValidOrderId(orderId) {
      if ((typeof orderId !== 'string') || (orderId.length === 0)) {
         throw 'invalid orderId \"' + orderId + '\"';
      } 
   };

   var assertValidRequestData = function assertValidRequestData(requestData) {
      var isValid =  (requestData !== undefined)                        &&
                     (typeof requestData.idempotencyKey === 'string')   &&
                     (requestData.idempotencyKey.length > 0)            &&
                     (typeof requestData.customerId === 'string')       &&
                     (requestData.customerId.length > 0)                &&
                     (typeof requestData.cartContent === typeof([]));
      
      requestData.cartContent.forEach(content => {
         isValid  =  isValid                                            &&
                     (typeof content.productId === 'string')            &&
                     (content.productId.length > 0)                     &&
                     (typeof content.quantity === 'number')             &&
                     (content.quantity > 0);
      });
                 
      if(!isValid) {
         throw 'invalid request data';
      }
   };

   var createOrderDocument = function createOrderDocument(requestData) {
      var document = {
         idempotencyKey:   requestData.idempotencyKey, 
         customerId:       requestData.customerId, 
         cartContent:      [],
         state:            STATES.new.toString(),
         lastModification: Date.now()
      };
      requestData.cartContent.forEach(content => {
         document.cartContent.push({productId: content.productId, quantity: content.quantity});
      });
      return document;
   };

   var createOrderIfItDoesNotExist = function createOrderIfItDoesNotExist(requestData) {
      return async function(db) {
         try {
            var foundRecord = await db.findOne(COLLECTION_NAME, {idempotencyKey: requestData.idempotencyKey});
            if (foundRecord !== null) {
               return {orderId: foundRecord._id.toString()};
            } else {
               var document   = createOrderDocument(requestData);
               var id         = await db.insert(COLLECTION_NAME, document);
               return {orderId: id};
            }
         } catch(e) {
            throw 'failed to create order with idempotencyKey \"' + requestData.idempotencyKey + '\": ' + e;
         }
      };
   };

   var getOrderIfItExists = function getOrderIfItExists(orderId) {
      return async function(db) {
         try {
            var foundRecord = await db.findOne(COLLECTION_NAME, {_id: ObjectId(orderId)});
            if (foundRecord !== null) {
               return foundRecord;
            } else {
               throw 'no order exists with id \"' + orderId + '\"';
            }
         } catch(e) {
            throw 'failed to get order: ' + e;
         }
      };
   };

   var findAllIds = async function findAllIds(db) {
      return db.getAllIds(COLLECTION_NAME);
   };

   this.start = async function start() {
      database = await(new webshop.database.AzureCosmosDB('orders')).open();
      new webshop.orders.OrderWorker(database, COLLECTION_NAME);
   };

   this.createOrder = async function createOrder(requestData) {
      LOGGER.logDebug('create order (requestData=' + JSON.stringify(requestData) + ')');
      assertDatabaseConnected();
      assertValidRequestData(requestData);
      return database.executeAsTransaction(createOrderIfItDoesNotExist(requestData));
   };

   this.getOrder = async function getOrder(orderId) {
      LOGGER.logDebug('get order (id=' + orderId + ')');
      assertDatabaseConnected();
      assertValidOrderId(orderId);
      return database.executeAsTransaction(getOrderIfItExists(orderId));
   };

   this.deleteOrder = async function deleteOrder(orderId) {
      LOGGER.logDebug('delete order (id=' + orderId + ')');
      assertDatabaseConnected();
      assertValidOrderId(orderId);
      return database.deleteOne(COLLECTION_NAME, {_id: ObjectId(orderId)}); // no transaction required because CRUD-operations are atomic in MongoDB
   };

   this.getOrderIds = async function getOrderIds() {
      LOGGER.logDebug('get order IDs');
      assertDatabaseConnected();
      return database.executeAsTransaction(findAllIds);
   };
};