/* global assertNamespace, webshop */

require('../NamespaceUtils.js');

assertNamespace('webshop.database');

webshop.database.Database = function Database() {
   
   var createErrorFor = function createErrorFor(functionName) {
      return new Error('webshop of webshop.database.Database did not implement the method \"' + functionName + '\"');
   };
   
   /**
    * Opens the database.
    * 
    * returns a Promise
    */
   this.open = function open() {
      throw createErrorFor('insert');
   };

   /**
    * Close the database and its underlying connections.
    * 
    * returns a Promise
    */
   this.close = function close() {
      throw createErrorFor('close');
   };
   
   /**
    * Inserts the provided document into the collection.
    * 
    * returns a Promise
    */
    this.insert = function insert(collectionName, document) {
      throw createErrorFor('insert');
   };
};
 