param location string = 'westeurope'

targetScope = 'subscription'

resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  location: location
  name: 'rg-demoproject'
}

module services 'services.bicep' = {
  scope: resourceGroup
  name: 'services'
  params: {
    location: location
  }
}
