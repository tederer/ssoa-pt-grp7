/* global webshop, assertNamespace */

require('../NamespaceUtils.js');

assertNamespace('webshop.webserver');

const http = require('http');

webshop.webserver.HttpClient = function HttpClient() {

   const TIMEOUT_IN_MS = 10 * 1000;
   
   var request = async function request(hostname, path, method, data) {
      var requestSendsDataInBody = (typeof method === 'string') && ((method === 'POST') || (method === 'DELETE'));
         
      var inputIsValid =    (typeof hostname === 'string')   && 
                            (typeof path     === 'string')   && 
                            (typeof method   === 'string')   && 
                           (!requestSendsDataInBody || (requestSendsDataInBody && (data !== undefined)));

      if (!inputIsValid) {
         return Promise.reject('at least one argument is not a string');
      }

      return new Promise((resolve, reject) => {
         const options = {
            hostname:   hostname,
            path:       path,
            method:     method.toUpperCase(),
            timeout:    TIMEOUT_IN_MS
         };

         var description = 'options=' + JSON.stringify(options) + (requestSendsDataInBody ? ',data=' + JSON.stringify(data) : '');

         var httpRequest = http.request(options, response => {
            var data = '';
            response.setEncoding('utf8');
            response.on('data',  chunk => data += chunk);
            response.on('error', error => reject('response error (' + description + '): ' + error));
            response.on('end',   ()    => resolve({statusCode: response.statusCode, data: JSON.parse((data.length === 0) ? '""' : data)}));
         });

         httpRequest.on('error',   error => reject('request error (' + description + '): ' + error));
         httpRequest.on('timeout', error => reject('request timed out (' + description + '): ' + error));
         if (requestSendsDataInBody) {
            var contentToSend = JSON.stringify(data);
            httpRequest.setHeader('Content-Type', 'application/json');
            httpRequest.setHeader('Content-Length', contentToSend.length); 
            httpRequest.write(contentToSend, 'utf8');
         }
         httpRequest.end();
      });
   };

   /**
    * Sends a HTTP GET request to hostname:path.
    * 
    * returns an object containing the statusCode and the received data.
    */
   this.get = async function get(hostname, path) {
      return request(hostname, path, 'GET');
   };

   /**
    * Sends a HTTP POST request containing data (as content type "application/json") to hostname:path.
    * 
    * returns an object containing the statusCode and the received data.
    */
    this.post = async function post(hostname, path, data) {
      return request(hostname, path, 'POST', data);
   };

   /**
    * Sends a HTTP DELETE request containing data (as content type "application/json") to hostname:path.
    * 
    * returns an object containing the statusCode and the received data.
    */
    this.delete = async function del(hostname, path, data) {
      return request(hostname, path, 'DELETE', data);
   };
};
