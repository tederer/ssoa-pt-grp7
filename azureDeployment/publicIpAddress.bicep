param location string

resource publicIpAddress 'Microsoft.Network/publicIpAddresses@2020-08-01' = {
  name: 'public-ip'
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    publicIPAllocationMethod: 'Static'
  }
}
