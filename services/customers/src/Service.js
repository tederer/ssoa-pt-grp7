/* global webshop, assertNamespace, setTimeout, process */

const { request }  = require('express');
const { ObjectId } = require('mongodb');

require('../../common/src/NamespaceUtils.js');
require('../../common/src/logging/LoggingSystem.js');
require('../../common/src/database/AzureCosmosDB.js');

assertNamespace('webshop.customers');

webshop.customers.Service = function Service() {

   const LOGGER            = webshop.logging.LoggingSystem.createLogger('Service');
   const COLLECTION_NAME   = 'customers';

};