var EntityViewer = function EntityViewer(settings) {

   const BASE_URL                = '';  // use something like "http://13.69.50.179" for debugging
   const REFRESH_INTERVAL_IN_MS  = 1000;
   
   const entityName              = settings.entityName;
   const descriptionId           = settings.decriptionId;
   const tableHeadId             = settings.tableHeadId;
   const tableBodyId             = settings.tableBodyId;
   const lastModificationId      = settings.lastModificationId;
   const columnNames             = settings.columnNames;
   
   var lastModificationInUse;
   var lastEntityIdsInUse = [];

   var httpGet = async function httpGet(path) {
      return new Promise((resolve, reject) => {
         $.get(path, data => resolve( data )).fail(e => reject(e));
      });
   };

   var refreshUI = function refreshUI(entities, lastModification, pollingFailed) {
      var bodyHtml = '';
      entities.forEach(entity => {
         bodyHtml += '<tr>';
         columnNames.forEach(name => {
            bodyHtml += '<td>' + entity[name] + '</td>\n';
         });
         bodyHtml += '</tr>';
      });
      $('#' + tableBodyId).html(bodyHtml);

      var isValidTimestamp     = (typeof lastModification === 'number') && (lastModification > 0);
      var timestamp            = isValidTimestamp ? (new Date(lastModification)).toLocaleString() : 'n.a.';
      var lastModificationText = ((typeof pollingFailed === 'boolean') && pollingFailed) ? 'polling failed' : timestamp;
      $('#' + lastModificationId).text(lastModificationText);
   };

   var initializeDocumentTitle = function initializeDocumentTitle() {
      $('title').text(entityName);
   };

   var initializeTableHead = function initializeTableHead() {
      var headHtml = '<tr class="table-dark">';
      columnNames.forEach(name => {
         headHtml += '<th scope="col">' + name + '</th>';
      });
      headHtml += '</tr>';
      $('#' + tableHeadId).html(headHtml);
   };

   var getEntities = async function getEntities() {
      var ids      = await httpGet(BASE_URL + '/' + entityName);
      var entities = {lastModification: 0, data: []};
      
      for (var id of ids) {
         var entity                = await httpGet(BASE_URL + '/' + entityName + '/byid/' + id);
         entities.lastModification = Math.max(entity.lastModification, entities.lastModification);
         entities.data.push(entity);
      }
      return entities;
   };

   var refreshRequired = function refreshRequired(entities) {
      var entityIds                 = entities.data.map(e => e._id).sort();
      var entityIdsDiffer           = (lastEntityIdsInUse.length !== entityIds.length) || (lastEntityIdsInUse.join() != entityIds.join());
      var lastModificationDiffers   = lastModificationInUse !== entities.lastModification;
      var entityChanged             = false;

      if (entityIdsDiffer || lastModificationDiffers) {
         lastModificationInUse = entities.lastModification;
         lastEntityIdsInUse    = entityIds;
         entityChanged         = true;
      }
      return entityChanged;
   };

   var refreshData = async function refreshData() {
      try {
         var entities = await getEntities();
         if (refreshRequired(entities)) {
            refreshUI(entities.data, entities.lastModification);
         }
      } catch(e) {
         console.log(e);
         lastModificationInUse = undefined;
         lastEntityIdsInUse    = [];
         refreshUI([], undefined, true);
      }

      setTimeout(refreshData, REFRESH_INTERVAL_IN_MS);
   };

   window.onload = async function() {
      initializeDocumentTitle();
      initializeTableHead();
      $('#' + descriptionId).text(entityName);
      refreshData();
   };
};