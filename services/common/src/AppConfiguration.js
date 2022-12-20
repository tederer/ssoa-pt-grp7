/* global webshop, assertNamespace */

// https://learn.microsoft.com/en-us/azure/azure-app-configuration/
// https://www.npmjs.com/package/@azure/app-configuration
// 

require('../../common/src/NamespaceUtils.js');

const { AppConfigurationClient } = require('@azure/app-configuration');

assertNamespace('webshop');

webshop.AppConfiguration = function AppConfiguration(connectionString) {
   const client = new AppConfigurationClient(connectionString);

   /**
    * Gets to value of the provided key.
    * 
    * returns the value to the provided key
    */
    this.get = async function get(key) {
      return (await client.getConfigurationSetting({ key: key })).value;
   };
};
