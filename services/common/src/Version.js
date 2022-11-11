/* global assertNamespace, webshop */

assertNamespace('webshop');

var fs = require('fs');
   
webshop.getVersion = function getVersion() {
    var result;
    try {
        var fileContent = fs.readFileSync('package.json', 'utf8');
        var packageJson = JSON.parse(fileContent);
        result = packageJson.version;
    } catch(e) {
        result = e;
    }
    return result;
};