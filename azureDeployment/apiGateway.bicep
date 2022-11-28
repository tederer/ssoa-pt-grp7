param location     string

var name = 'API-gateway'

resource vnetSubnet 'Microsoft.Network/virtualNetworks/subnets@2022-05-01' existing = {
  scope: resourceGroup()
  name: 'vnet/apiGatewaySubnet'
}

resource webserverService 'Microsoft.ContainerInstance/containerGroups@2021-10-01' existing = {
  scope: resourceGroup()
  name: 'webserver-service'
}

resource productsService 'Microsoft.ContainerInstance/containerGroups@2021-10-01' existing = {
  scope: resourceGroup()
  name: 'products-service'
}

resource publicIpAddress 'Microsoft.Network/publicIpAddresses@2020-08-01' = {
  name: 'public-ip'
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    publicIPAllocationMethod: 'Dynamic'
  }
}

resource apiGateway 'Microsoft.Network/applicationGateways@2022-05-01' = {
  name: name
  location: location
  properties:{
    sku:{
      name:'Standard_Small'
      tier:'Standard'
      capacity: 1
    }
    gatewayIPConfigurations:[
      {
        name: 'internalIpConfig'
        properties:{
          subnet: {
            id: vnetSubnet.id
          }
        }
      }
    ]
    frontendIPConfigurations:[
      {
        name: 'frontendIpConfig'
        properties:{
          publicIPAddress:{
            id: publicIpAddress.id
          }
        }
      }
    ]
    frontendPorts:[
      {
        name: 'port_80'
        properties:{
          port: 80
        }
      }
    ]
    backendAddressPools:[
      {
        name: 'webserverBackendPool'
        properties:{
          backendAddresses:[
            {
              ipAddress: webserverService.properties.ipAddress.ip
            }
          ]
        }
      }
      {
        name: 'productsBackendPool'
        properties:{
          backendAddresses:[
            {
              ipAddress: productsService.properties.ipAddress.ip
            }
          ]
        }
      }
    ]
     probes:[
      {
        name: 'webserverProbe'
        properties:{
          protocol:'Http'
          host: webserverService.properties.ipAddress.ip
          path: '/info'
          interval: 30
          timeout: 30
          unhealthyThreshold: 3
        }
      }
      {
        name: 'productsProbe'
        properties:{
          protocol:'Http'
          host: productsService.properties.ipAddress.ip
          path: '/info'
          interval: 30
          timeout: 30
          unhealthyThreshold: 3
        }
      }
     ]
    backendHttpSettingsCollection: [
      {
        name: 'webserverBackendHTTPSetting'
        properties: {
          port: 80
          protocol: 'Http'
          cookieBasedAffinity: 'Disabled'
          pickHostNameFromBackendAddress: false
          requestTimeout: 20
           probe: {
             id: resourceId('Microsoft.Network/applicationGateways/probes', name, 'webserverProbe')
           }
        }
      }
      {
        name: 'productsBackendHTTPSetting'
        properties: {
          port: 80
          protocol: 'Http'
          cookieBasedAffinity: 'Disabled'
          pickHostNameFromBackendAddress: false
          requestTimeout: 20
           probe: {
             id: resourceId('Microsoft.Network/applicationGateways/probes', name, 'productsProbe')
           }
        }
      }
    ]
    httpListeners: [
      {
        name: 'httpListener'
        properties: {
          frontendIPConfiguration: {
            id: resourceId('Microsoft.Network/applicationGateways/frontendIPConfigurations', name, 'frontendIpConfig')
          }
          frontendPort: {
            id: resourceId('Microsoft.Network/applicationGateways/frontendPorts', name, 'port_80')
          }
          protocol: 'Http'
          requireServerNameIndication: false
        }
      }
    ]
    urlPathMaps:[
      {
        name: 'urlPathMaps'
        properties:{
          defaultBackendHttpSettings:{
            id: resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', name, 'webserverBackendHTTPSetting')
          }
          defaultBackendAddressPool: {
            id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', name, 'webserverBackendPool')
          }
          pathRules:[
            {
              name: 'productsPathRule'
              properties:{
                paths:['/products/*']
                backendAddressPool: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', name, 'productsBackendPool')
                }
                backendHttpSettings: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', name, 'productsBackendHTTPSetting')
                }      
              }
            }
          ]
        }
      }
    ]
    requestRoutingRules: [
      {
        name: 'routing'
        properties:{
          ruleType: 'PathBasedRouting'
          httpListener:{
            id: resourceId('Microsoft.Network/applicationGateways/httpListeners', name, 'httpListener')
          }
          urlPathMap:{
            id: resourceId('Microsoft.Network/applicationGateways/urlPathMaps', name, 'urlPathMaps')
          }
        }
      }
    ]
  }
}
