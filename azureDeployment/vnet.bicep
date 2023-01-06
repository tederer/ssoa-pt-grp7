param location      string
param vnetName      string

var serviceNames = ['apiGateway', 'webserver', 'products', 'orders', 'customers']

resource vnet 'Microsoft.Network/virtualNetworks@2022-07-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
    subnets: [for (serviceName, index) in serviceNames: index > 0 ? {
      name: '${serviceName}Subnet'
      properties: {
        addressPrefix: '10.0.1${index}.0/24'
        delegations:[
          {
            name: 'Microsoft.ContainerInstance/containerGroups'
            properties:{
              serviceName: 'Microsoft.ContainerInstance/containerGroups'
            }
          }
        ]
      }
    } : {
      name: 'apiGatewaySubnet'
      properties:{
        addressPrefix: '10.0.2.0/24'
      }
    }]
  }
}
