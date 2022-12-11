/* global webshop, assertNamespace, setTimeout */

const { request } = require('express');
const { ObjectId } = require('mongodb');

require('../../common/src/NamespaceUtils.js');
require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/database/AzureCosmosDB.js');

assertNamespace('webshop.orders');

webshop.orders.Service = function Service() {

   var LOGGER           = webshop.logging.LoggingSystem.createLogger('Service');
   var COLLECTION_NAME  = 'orders';

   var database;

   var cartContentIsValid = function cartContentIsValid(cartContent) {
      var valid = true;
      cartContent.forEach(product => {
       valid = valid                                  &&
            (typeof product.productId === 'string')   &&
            (product.productId.length > 0)            &&
            (typeof product.quantity === 'number')    &&
            (product.quantity > 0);
      });
      return valid;
   };

   var isValid = function isValid(requestData) {
      return   (requestData !== undefined)                        &&
               (typeof requestData.idempotencyKey === 'string')   &&
               (requestData.idempotencyKey.length > 0)            &&
               (typeof requestData.customerId === 'string')       &&
               (requestData.customerId.length > 0)                &&
               (typeof requestData.cartContent === typeof([]))    &&
               cartContentIsValid(requestData.cartContent);
   };

   var openDatabase = function openDatabase() {
      (new webshop.database.AzureCosmosDB('orders')).open()
         .then(db => database = db)
         .catch(error => {
            LOGGER.logError('failed to open database (error=' + error.message + ')' + (error.tryAgain ? ' -> will try it again in 1s' : ''));
            if (error.tryAgain) {
               setTimeout(() => openDatabase(), 1000);
            }
         });
   };

   var createOrderDocument = function createOrderDocument(requestData) {
      var document = {
         idempotencyKey:   requestData.idempotencyKey, 
         customerId:       requestData.customerId, 
         cartContent:      []
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
               var document      = createOrderDocument(requestData);
               var insertResult  = await db.insert(COLLECTION_NAME, document);
               return {orderId: insertResult.insertedId};
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

   this.createOrder = async function createOrder(requestData) {
      LOGGER.logInfo('createOrder (requestData=' + JSON.stringify(requestData) + ')');
      
      if (isValid(requestData)) {
         return database.executeAsTransaction(createOrderIfItDoesNotExist(requestData));
      } else {
         throw 'invalid request data';
      }     
   };

   this.getOrderIds = async function getOrderIds() {
      LOGGER.logInfo('getOrderIds');
      return database.getAllIds(COLLECTION_NAME);
   };

   this.getOrder = async function getOrder(orderId) {
      if ((typeof orderId === 'string') && (orderId.length > 0)) {
         return database.executeAsTransaction(getOrderIfItExists(orderId));
      } else {
         throw 'invalid orderId \"' + orderId + '\"';
      }
   };

   this.deleteOrder = async function deleteOrder(orderId) {
      if ((typeof orderId === 'string') && (orderId.length > 0)) {
         return database.deleteOne(COLLECTION_NAME, {_id: ObjectId(orderId)}); // no transaction required because CRUD-operations are atomic in MongoDB
      } else {
         throw 'invalid orderId \"' + orderId + '\"';
      }
   };

   openDatabase();
};