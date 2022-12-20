/* global webshop, assertNamespace */

require('../NamespaceUtils.js');

assertNamespace('webshop.webserver');

const http = require('http');

webshop.webserver.HttpClient = function HttpClient() {

   const TIMEOUT_IN_MS = 10 * 1000;
   
   var request = async function request(hostname, path, method, data) {
      var inputIsValid =    (typeof hostname === 'string')   && 
                            (typeof path     === 'string')   && 
                            (typeof method   === 'string')   && 
                           ((typeof method   === 'string')   && ((method !== 'POST') || ((method === 'POST') && (data !== undefined))));

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

         var isPostRequest = options.method === 'POST';
         var description   = 'options=' + JSON.stringify(options) + (isPostRequest ? ',data=' + JSON.stringify(data) : '');

         var request = http.request(options, response => {
            var data = '';
            response.setEncoding('utf8');
            response.on('data',  chunk => data += chunk);
            response.on('error', error => reject('response error (' + description + '): ' + error));
            response.on('end',   ()    => resolve({statusCode: response.statusCode, data: JSON.parse((data.length === 0) ? '""' : data)}));
         });

         request.on('error',   error => reject('request error (' + description + '): ' + error));
         request.on('timeout', error => reject('request timed out (' + description + '): ' + error));
         if (isPostRequest) {
            request.setHeader('Content-Type', 'application/json');
            request.write(JSON.stringify(data));
         }
         request.end();
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
};
