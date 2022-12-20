/* global webshop, assertNamespace, setTimeout, process */

require('../../common/src/NamespaceUtils.js');

assertNamespace('webshop.orders');

// States (in upper case) and their transitions (in camel case) of an order:
// 
//  NEW ── workerTakesIt ──> IN_PROGRESS ─── creditOk & productsAvailable ──> APPROVED
//   ^                           │  │    
//   │                           │  │  ┌──── notEnoughCredit ─────────┐
//   └──────── workerTimeout ────┘  └──┤                              ├─────> READY_FOR_UNDO ── workerTakesIt ──> UNDO ──> REJECTED
//                                     └──── productNotAvailable ─────┘              ^                             │ 
//                                                                                   └───────── workerTimeout ─────┘ 

var State = function State(name) {
   this.toString = function toString() {
     return name;
   };
};
 
webshop.orders.States = {
   new:           new State('NEW'),
   inProgress:    new State('IN_PROGRESS'),
   approved:      new State('APPROVED'),
   readyForUndo:  new State('READY_FOR_UNDO'),
   undo:          new State('UNDO'),
   rejected:      new State('REJECTED')
};
