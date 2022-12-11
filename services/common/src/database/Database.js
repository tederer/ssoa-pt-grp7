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
   this.open = async function open() {
      throw createErrorFor('insert');
   };

   /**
    * Close the database and its underlying connections.
    * 
    * returns a Promise
    */
   this.close = async function close() {
      throw createErrorFor('close');
   };
   
   /**
    * Inserts the provided document into the collection.
    * 
    * returns a Promise
    */
   this.insert = async function insert(collectionName, document) {
      throw createErrorFor('insert');
   };

   /**
    * Fetches the first document that matches the query.
    * 
    * returns a Promise
    */
   this.findOne = async function findOne(collectionName, query) {
      throw createErrorFor('findOne');
   };

   /**
    * Deletes the first document that matches the query.
    * 
    * returns a Promise
    */
   this.deleteOne = async function deleteOne(collectionName, query) {
      throw createErrorFor('deleteOne');
   };

   /**
    * Queries the IDs of all documents in the corresponding collection.
    * 
    * returns a Promise
    */
   this.getAllIds = async function getAllIds(collectionName) {
      throw createErrorFor('getAllIds');
   };

   /**
    * Executes the provided operations as a transaction. operations is a function receiving the database instance.
    * 
    * returns a Promise
    */
   this.executeAsTransaction = async function executeAsTransaction(operations) {
      throw createErrorFor('findOne');
   };
};
