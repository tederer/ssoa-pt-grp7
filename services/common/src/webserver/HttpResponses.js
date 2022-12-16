/* global webshop, assertNamespace */

require('../NamespaceUtils.js');

assertNamespace('webshop.webserver');

webshop.webserver.HttpResponses = {
   OK:            200,
   BAD_REQUEST:   400,
   NOT_FOUND:     404
};