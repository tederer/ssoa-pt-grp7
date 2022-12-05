param location string = 'westeurope'

targetScope = 'subscription'

var databaseName = 'ssoa-pt-grp7'

resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  location: location
  name: 'rg-demoproject'
}

module vnet 'vnet.bicep' = {
  scope: resourceGroup
  name: 'vnet'
  params:{
    location:     location
    vnetName:     'vnet'
  }
}

module database 'database.bicep' = {
  scope: resourceGroup
  name: 'mongoDB-database'
  params:{
    location: location
    databaseName: databaseName
  }
}

module services 'services.bicep' = {
  scope: resourceGroup
  name: 'services'
  params: {
    location:     location
    databaseName: databaseName
  }
  dependsOn:[vnet, database]
}

module apiGateway 'apiGateway.bicep' = {
  scope: resourceGroup
  name: 'apiGateway'
  params:{
    location: location
  }
  dependsOn:[vnet, services]
}
