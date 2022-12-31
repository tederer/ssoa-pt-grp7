param location string

var apiGatewayName = 'API-gateway'

var services = [
  {
    name:             'webserver'
    routingPath:      ''
    healthProbePath:  '/info'
  }
  {
    name:             'orders'
    routingPath:      '/order*'
    healthProbePath:  '/order/info'
  }
  {
    name:             'customers'
    routingPath:      '/customer*'
    healthProbePath:  '/customer/info'
  }
  {
    name:             'products'
    routingPath:      '/product*'
    healthProbePath:  '/product/info'
  }
]

resource vnetSubnet 'Microsoft.Network/virtualNetworks/subnets@2022-05-01' existing = {
  scope: resourceGroup()
  name: 'vnet/apiGatewaySubnet'
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
  name: apiGatewayName
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
    backendAddressPools:[for service in services: {
        name: concat(service.name, 'Pool')
        properties:{
          backendAddresses:[
            {
              ipAddress: reference(resourceId('Microsoft.ContainerInstance/containerGroups', concat(service.name, '-service')), '2021-10-01').ipAddress.ip
            }
          ]
        }
    }]
    probes: [for service in services: {
        name: concat(service.name, 'Probe')
        properties:{
          protocol:'Http'
          host: reference(resourceId('Microsoft.ContainerInstance/containerGroups', concat(service.name, '-service')), '2021-10-01').ipAddress.ip
          path: service.healthProbePath
          interval: 30
          timeout: 30
          unhealthyThreshold: 3
        }
    }]
    backendHttpSettingsCollection: [for service in services: {
        name: concat(service.name, 'BackendHTTPSetting')
        properties: {
          port: 80
          protocol: 'Http'
          cookieBasedAffinity: 'Disabled'
          pickHostNameFromBackendAddress: false
          requestTimeout: 20
           probe: {
             id: resourceId('Microsoft.Network/applicationGateways/probes', apiGatewayName, concat(service.name, 'Probe'))
           }
        }
    }]
    httpListeners: [
      {
        name: 'httpListener'
        properties: {
          frontendIPConfiguration: {
            id: resourceId('Microsoft.Network/applicationGateways/frontendIPConfigurations', apiGatewayName, 'frontendIpConfig')
          }
          frontendPort: {
            id: resourceId('Microsoft.Network/applicationGateways/frontendPorts', apiGatewayName, 'port_80')
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
            id: resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', apiGatewayName, 'webserverBackendHTTPSetting')
          }
          defaultBackendAddressPool: {
            id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', apiGatewayName, 'webserverPool')
          }
          pathRules: [for service in skip(services, 1): {
            name: concat(service.name, 'PathRule')
            properties:{
              paths:[service.routingPath]
              backendAddressPool: {
                id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', apiGatewayName, concat(service.name, 'Pool'))
              }
              backendHttpSettings: {
                id: resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', apiGatewayName, concat(service.name, 'BackendHTTPSetting'))
              }      
            }
          }]
        }
      }
    ]
    requestRoutingRules: [
      {
        name: 'routing'
        properties:{
          ruleType: 'PathBasedRouting'
          httpListener:{
            id: resourceId('Microsoft.Network/applicationGateways/httpListeners', apiGatewayName, 'httpListener')
          }
          urlPathMap:{
            id: resourceId('Microsoft.Network/applicationGateways/urlPathMaps', apiGatewayName, 'urlPathMaps')
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
