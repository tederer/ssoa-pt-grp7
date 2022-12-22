/* global webshop, process, assertNamespace, setTimeout */

const { ObjectId } = require('mongodb');

require('../../common/src/NamespaceUtils.js');
require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/webserver/HttpClient.js');
require('../../common/src/webserver/HttpResponses.js');

require('./States.js');

assertNamespace('webshop.orders');

webshop.orders.OrderWorker = function OrderWorker(database) {
   const MAX_DURATION_OF_A_SINGLE_PROCESSING_ATTEMPT_IN_MS  = 10000; // TODO take higher value
   const SLEEP_DURATION_IN_MS                               = 1000;
   const LOGGER                                             = webshop.logging.LoggingSystem.createLogger('OrderWorker');
   const STATES                                             = webshop.orders.States;
   const HTTP_CLIENT                                        = new webshop.webserver.HttpClient();
   const RESPONSE                                           = webshop.webserver.HttpResponses;

   var apiGatewayIpAddress;

   var setOrderState = async function setOrderState(order, state) {
      LOGGER.logInfo('setting state of order ' + order._id + ' to ' + state.toString());
      await database.updateOne({_id:  order._id}, {$set: {'state': state.toString(), lastModification: Date.now()}});
   };

   var getApiGatewayIpAddress = async function getApiGatewayIpAddress() {
      if (apiGatewayIpAddress === undefined) {
         const appConfig = new webshop.AppConfiguration(process.env.APP_CONFIG_CONNECTION_STRING);
         apiGatewayIpAddress = await appConfig.get('API_GATEWAY_IP_ADDR');
      }
      return apiGatewayIpAddress;
   };

   var afterTimeoutSetState = async function afterTimeoutSetState(stateOfInterest, newState, timeoutInMs) {
      var query = {
         $and: [  {state:              stateOfInterest.toString()},
                  {lastModification:   {$lt: Date.now() - timeoutInMs}} ]
      };
      
      var modifiedCount = await database.executeAsTransaction(async db => {
         return await db.updateMany(query, {$set: {'state': newState.toString(), lastModification: Date.now()}});
      });

      if (modifiedCount > 0) {
         LOGGER.logInfo('changed state from ' + stateOfInterest + ' to ' + newState + ' for ' + modifiedCount + ' order(s) because they expired');
      }
   };
   
   var resetStateOfExpiredOrdersInProgress = async function resetStateOfExpiredOrdersInProgress() {
      afterTimeoutSetState(STATES.inProgress, STATES.new, MAX_DURATION_OF_A_SINGLE_PROCESSING_ATTEMPT_IN_MS);
   };

   var resetStateOfExpiredOrdersInUndo = async function resetStateOfExpiredOrdersInUndo() {
      afterTimeoutSetState(STATES.undo, STATES.readyForUndo, MAX_DURATION_OF_A_SINGLE_PROCESSING_ATTEMPT_IN_MS);
   };

   var queryProductsInCart = async function queryProductsInCart(cartContent) {
      var productsInCart = {};

      for (var i = 0; i < cartContent.length; i++) {
         var content = cartContent[i];
         var response = await HTTP_CLIENT.get(await getApiGatewayIpAddress(), '/product/byid/' + content.productId);
         if (response.statusCode === RESPONSE.OK) {
            productsInCart[content.productId] = response.data;
         } else {
            throw 'failed to query product data (productId=' + content.productId + ',response=' + JSON.stringify(response) + ')';
         }
      }

      return productsInCart;
   };

   var calculateOrderTotal = function calculateOrderTotal(cartContent, productsInCart) {
      var total = 0;
      cartContent.forEach(content => total += content.quantity * productsInCart[content.productId].price);
      return total;
   };

   var getNextOrder = async function getNextOrder(stateOfInterest, newState) {
      return database.executeAsTransaction(async db => {
         var order = await db.getLongestUnmodified({state: stateOfInterest.toString()});
         if (order !== undefined) {
            setOrderState(order, newState);
         }
         return order;
      });
   };

   
   var getNextNewOrder = async function getNextNewOrder() {
      return getNextOrder(STATES.new, STATES.inProgress);
   };

   var getNextOrderToUndo = async function getNextOrderToUndo() {
      return getNextOrder(STATES.readyForUndo, STATES.undo);
   };

   var assertValidResponse = function assertValidResponse(response, description, order) {
      if (response.statusCode !== RESPONSE.OK) {
         setOrderState(order, STATES.readyForUndo);
         throw 'failed to ' + description + ': (HTTP status code=' + response.statusCode + ')';
      }
   };

   var progressNewOrders = async function progressNewOrders() {
      var order = await getNextNewOrder();
      
      while (order !== undefined) {
         LOGGER.logInfo('processing new order ' + order._id);
         var products       = await queryProductsInCart(order.cartContent);
         var orderTotal     = calculateOrderTotal(order.cartContent, products);
         var idempotencyKey = order._id.toString();
         
         var response = await HTTP_CLIENT.post(await getApiGatewayIpAddress(), '/customer/credit/increment', {
            idempotencyKey: idempotencyKey,
            customerId:     order.customerId,
            increment:      -orderTotal
         });
         assertValidResponse(response, 'decrement customer credit', order);
         
         for (var i = 0; i < order.cartContent.length; i++) {
            var content = order.cartContent[i];
            response = await HTTP_CLIENT.post(await getApiGatewayIpAddress(), '/product/quantity/increment', {
               idempotencyKey: idempotencyKey,
               productId:      content.productId,
               increment:      -content.quantity
            });
            assertValidResponse(response, 'decrement product quantity', order);
         }
         
         setOrderState(order, STATES.approved);
         order = await getNextNewOrder();
      }
   };

   var progressReadyForUndoOrders = async function progressReadyForUndoOrders() {
      var order = await getNextOrderToUndo();
      
      while (order !== undefined) {
         LOGGER.logInfo('processing undo order ' + order._id);
         var idempotencyKey = order._id.toString();

         var response = await HTTP_CLIENT.delete(await getApiGatewayIpAddress(), '/customer/credit/increment', {idempotencyKey: idempotencyKey});
         assertValidResponse(response, 'undo decrement customer credit', order);
         
         response = await HTTP_CLIENT.delete(await getApiGatewayIpAddress(), '/product/quantity/increment', {idempotencyKey: idempotencyKey});
         assertValidResponse(response, 'undo decrement product quantity', order);
         
         setOrderState(order, STATES.rejected);
         order = await getNextOrderToUndo();
      }
   };

   var startNextIteration = async function startNextIteration() {
      try {
         await progressNewOrders();
         await resetStateOfExpiredOrdersInProgress();
         await progressReadyForUndoOrders();
         await resetStateOfExpiredOrdersInUndo();
      } catch(error) {
         LOGGER.logError(error);
      }
      setTimeout(startNextIteration, SLEEP_DURATION_IN_MS);
   };

   startNextIteration();
};