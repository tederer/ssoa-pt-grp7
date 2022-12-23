param location string

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

resource ordersService 'Microsoft.ContainerInstance/containerGroups@2021-10-01' existing = {
  scope: resourceGroup()
  name: 'orders-service'
}

resource customersService 'Microsoft.ContainerInstance/containerGroups@2021-10-01' existing = {
  scope: resourceGroup()
  name: 'customers-service'
}

resource publicIpAddress 'Microsoft.Network/publicIpAddresses@2020-08-01' existing = {
  scope: resourceGroup()
  name:  'public-ip'
}

resource appConfig 'Microsoft.AppConfiguration/configurationStores@2022-05-01' existing = {
  scope: resourceGroup()
  name: 'ssoa-config'
}

resource apiGateway 'Microsoft.Network/applicationGateways@2022-05-01' = {
  name: name
  location: location
  properties:{
    sku:{
      name:'Standard_v2'
      tier:'Standard_v2'
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
        name: 'webserverPool'
        properties:{
          backendAddresses:[
            {
              ipAddress: webserverService.properties.ipAddress.ip
            }
          ]
        }
      }
      {
        name: 'productPool'
        properties:{
          backendAddresses:[
            {
              ipAddress: productsService.properties.ipAddress.ip
            }
          ]
        }
      }
      {
        name: 'orderPool'
        properties:{
          backendAddresses:[
            {
              ipAddress: ordersService.properties.ipAddress.ip
            }
          ]
        }
      }
      {
        name: 'customerPool'
        properties:{
          backendAddresses:[
            {
              ipAddress: customersService.properties.ipAddress.ip
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
        name: 'productProbe'
        properties:{
          protocol:'Http'
          host: productsService.properties.ipAddress.ip
          path: '/product/info'
          interval: 30
          timeout: 30
          unhealthyThreshold: 3
        }
      }
      {
        name: 'orderProbe'
        properties:{
          protocol:'Http'
          host: ordersService.properties.ipAddress.ip
          path: '/order/info'
          interval: 30
          timeout: 30
          unhealthyThreshold: 3
        }
      }
      {
        name: 'customerProbe'
        properties:{
          protocol:'Http'
          host: customersService.properties.ipAddress.ip
          path: '/customer/info'
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
             id: resourceId('Microsoft.Network/applicationGateways/probes', name, 'productProbe')
           }
        }
      }
      {
        name: 'ordersBackendHTTPSetting'
        properties: {
          port: 80
          protocol: 'Http'
          cookieBasedAffinity: 'Disabled'
          pickHostNameFromBackendAddress: false
          requestTimeout: 20
           probe: {
             id: resourceId('Microsoft.Network/applicationGateways/probes', name, 'orderProbe')
           }
        }
      }
      {
        name: 'customersBackendHTTPSetting'
        properties: {
          port: 80
          protocol: 'Http'
          cookieBasedAffinity: 'Disabled'
          pickHostNameFromBackendAddress: false
          requestTimeout: 20
           probe: {
             id: resourceId('Microsoft.Network/applicationGateways/probes', name, 'customerProbe')
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
            id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', name, 'webserverPool')
          }
          pathRules:[
            {
              name: 'productsPathRule'
              properties:{
                paths:['/product*']
                backendAddressPool: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', name, 'productPool')
                }
                backendHttpSettings: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', name, 'productsBackendHTTPSetting')
                }      
              }
            }
            {
              name: 'ordersPathRule'
              properties:{
                paths:['/order*']
                backendAddressPool: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', name, 'orderPool')
                }
                backendHttpSettings: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', name, 'ordersBackendHTTPSetting')
                }      
              }
            }
            {
              name: 'customersPathRule'
              properties:{
                paths:['/customer*']
                backendAddressPool: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', name, 'customerPool')
                }
                backendHttpSettings: {
                  id: resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', name, 'customersBackendHTTPSetting')
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
          priority: 300
        }
      }
    ]
  }
}

resource keyValue1 'Microsoft.AppConfiguration/configurationStores/keyValues@2022-05-01' = {
  parent: appConfig
  name: 'API_GATEWAY_IP_ADDR'
  properties:{
    value: publicIpAddress.properties.ipAddress
  }
  dependsOn:[apiGateway]
}
