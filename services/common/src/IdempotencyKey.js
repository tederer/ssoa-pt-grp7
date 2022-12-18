/* global webshop, assertNamespace */

// https://www.mongodb.com/docs/manual/reference/method/ObjectId/

require('../../common/src/NamespaceUtils.js');

const { ObjectId } = require('mongodb');

assertNamespace('webshop');

webshop.IdempotencyKey = function IdempotencyKey() {
   /**
    * Creates a new idempotency key
    * 
    * returns the key as a string
    */
   this.create = function create() {
      return ObjectId().toString();
   };

   /**
    * Checks if the provides string is a valif idempotency key.
    * 
    * returns true if valid, otherwise false
    */
    this.isValid = function isValid(keyAsString) {
      return (typeof keyAsString === 'string') && (keyAsString.match(/^[0-9a-fA-F]{24}$/) !== null);
   };
};
