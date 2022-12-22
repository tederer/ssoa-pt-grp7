param location string

resource appConfig 'Microsoft.AppConfiguration/configurationStores@2022-05-01' = {
  name: 'ssoa-config'
  location: location
  sku:{
    name: 'Free'
  }
}

resource keyValue1 'Microsoft.AppConfiguration/configurationStores/keyValues@2022-05-01' = {
  parent: appConfig
  name: 'APP_CONFIG_CONNECTION_STRING'
  properties:{
    value: appConfig.listKeys().value[0].connectionString
  }
}
