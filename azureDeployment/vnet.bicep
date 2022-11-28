param location      string
param vnetName      string

resource vnet 'Microsoft.Network/virtualNetworks@2022-01-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
    subnets: [
      {
        name: 'servicesSubnet'
        properties: {
          addressPrefix: '10.0.1.0/24'
          delegations:[
            {
              name: 'Microsoft.ContainerInstance/containerGroups'
              properties:{
                serviceName: 'Microsoft.ContainerInstance/containerGroups'
              }
            }
          ]
        }
      }
      {
        name: 'apiGatewaySubnet'
        properties:{
          addressPrefix: '10.0.2.0/24'
        }
      }
    ]
  }
}
