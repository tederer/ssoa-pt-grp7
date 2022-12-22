/* global webshop, assertNamespace */

require('../NamespaceUtils.js');
require('../webserver/HttpResponses.js');

assertNamespace('webshop.service');

webshop.service.BasicEntityOperations = function BasicEntityOperations(settings) {

   const LOGGER                   = webshop.logging.LoggingSystem.createLogger('BasicEntityOperations');
   const RESPONSE                 = webshop.webserver.HttpResponses;
   const { ObjectId }             = require('mongodb');
   const app                      = settings.app;
   const database                 = settings.database; 
   const entityName               = settings.entityName;
   const pathPrefix               = settings.pathPrefix;
   const creationRequestDataValid = settings.creationRequestDataValid;
   const createEntityDocument     = settings.createEntityDocument;
   
   var assertDatabaseConnected = function assertDatabaseConnected() {
      if (database === undefined) {
         throw 'database not (yet) connected -> cannot execute operatation (Did you forget to call the start-method?)';
      }
   };

   var assertValidRequestData = function assertValidRequestData(requestData) {
      if(!creationRequestDataValid(requestData)) {
         throw 'invalid request data';
      }
   };

   var assertValidEntityId = function assertValidEntityId(id) {
      if ((typeof id !== 'string') || (id.length === 0)) {
         throw 'invalid id \"' + id + '\"';
      } 
   };

   var logRequest = function logRequest(request) {
      LOGGER.logDebug(request.method + ' request [path: ' + request.path + ']');
   };
      
   var getEntityId = function getEntityId(request) {
      return request.path.substring(request.path.lastIndexOf('/') + 1);
   };
      
   var createEntityIfItDoesNotExist = function createEntityIfItDoesNotExist(requestData) {
      return async db => {
         try {
            var previouslyCreatedEntity = await db.findOne({idempotencyKey: requestData.idempotencyKey});
            if (previouslyCreatedEntity !== null) {
               return {id: previouslyCreatedEntity._id.toString(), createdCount: 0};
            }
            
            var document               = createEntityDocument(requestData);
            var nowInMs                = Date.now();
            document.creation          = nowInMs;
            document.lastModification  = nowInMs;

            var id         = await db.insert(document);
            return {id: id, createdCount: 1};
            
         } catch(error) {
            throw 'failed to create ' + entityName + ' with idempotencyKey \"' + requestData.idempotencyKey + '\": ' + error;
         }
      };
   };

   var getEntityIfItExists = function getEntityIfItExists(id) {
      return async db => {
         try {
            var foundRecord = await db.findOne({_id: ObjectId(id)});
            if (foundRecord !== null) {
               return foundRecord;
            } else {
               throw 'no ' + entityName + ' exists with id \"' + id + '\"';
            }
         } catch(e) {
            throw 'failed to get ' + entityName + ': ' + e;
         }
      };
   };

   var createEntity = async function createEntity(requestData) {
      LOGGER.logDebug('create ' + entityName + ' (requestData=' + JSON.stringify(requestData) + ')');
      assertDatabaseConnected();
      assertValidRequestData(requestData);
      return database.executeAsTransaction(createEntityIfItDoesNotExist(requestData));
   };
   
   var getEntityIds = async function getEntityIds() {
      LOGGER.logDebug('get ' + entityName + ' IDs');
      assertDatabaseConnected();
      return database.getAllIds();  // no transaction required because an operation on a single document is atomic
   };

   var getEntity = async function getEntity(id) {
      LOGGER.logDebug('get ' + entityName + ' (id=' + id + ')');
      assertDatabaseConnected();
      assertValidEntityId(id);
      return database.executeAsTransaction(getEntityIfItExists(id));
   };

   var deleteEntity = async function deleteEntity(id) {
      LOGGER.logDebug('delete ' + entityName + ' (id=' + id + ')');
      assertDatabaseConnected();
      assertValidEntityId(id);
      return database.deleteOne({_id: ObjectId(id)}); // no transaction required because an operation on a single document is atomic
   };

   app.post(pathPrefix, (request, response) => {
      logRequest(request);
      
      createEntity(request.body)
         .then(result => {
            if (result.createdCount > 0) {
               LOGGER.logInfo('created ' + entityName + ' ' + result.id);
            }
            response.status(RESPONSE.OK).json({id: result.id});
         })
         .catch(error => {
            LOGGER.logError(error);
            response.status(RESPONSE.BAD_REQUEST).end();
         });
   });

   app.get(pathPrefix, (request, response) => {
      logRequest(request);
      
      getEntityIds()
         .then(result => response.status(RESPONSE.OK).json(result))
         .catch(error => {
            LOGGER.logError(error);
            response.status(RESPONSE.BAD_REQUEST).end();
         });
   });

   app.get(new RegExp(pathPrefix + '\/byid\/[^\/]+'), (request, response) => {
      logRequest(request);
      var id = getEntityId(request);
      
      getEntity(id)
         .then(result => response.status(RESPONSE.OK).json(result))
         .catch(error => {
            LOGGER.logError(error);
            response.status(RESPONSE.NOT_FOUND).end();
         });
   });

   app.delete(new RegExp(pathPrefix + '\/byid\/[^\/]+'), (request, response) => {
      logRequest(request);
      var id = getEntityId(request);
      
      deleteEntity(id)
         .then(deletedCount => {
            if (deletedCount > 0) {
               LOGGER.logInfo('deleted ' + entityName + ' ' + id);
            }
            var statusCode = (deletedCount > 0) ? RESPONSE.OK : RESPONSE.NOT_FOUND;
            response.status(statusCode).end();
         })
         .catch(error => {
            LOGGER.logError(error);
            response.status(RESPONSE.BAD_REQUEST).end();
         });
   });
};
