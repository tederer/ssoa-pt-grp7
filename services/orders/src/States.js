/* global webshop, assertNamespace, setTimeout, process */

require('../../common/src/NamespaceUtils.js');

assertNamespace('webshop.orders');

var State = function State(name) {
   this.toString = function toString() {
     return name;
   };
}
 
webshop.orders.States = {
   new:        new State('NEW'),
   inProgress: new State('IN_PROGRESS'),
   approved:   new State('APPROVED'),
   rejected:   new State('REJECTED')
}
