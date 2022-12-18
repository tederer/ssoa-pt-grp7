param location string

resource appConfig 'Microsoft.AppConfiguration/configurationStores@2022-05-01' = {
  name: 'ssoa-config'
  location: location
  sku:{
    name: 'Free'
  }
}
