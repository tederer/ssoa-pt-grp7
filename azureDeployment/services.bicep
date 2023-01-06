param location      string
param databaseName  string

var image               = 'node:lts-alpine'
var port                = 80
var cpuCores            = 1
var memoryInGb          = 1
var restartPolicy       = 'Always'
var gitRepoUrl          = 'https://github.com/tederer/ssoa-pt-grp7.git'
var serviceNames        = ['webserver', 'products', 'orders', 'customers']

resource appConfig 'Microsoft.AppConfiguration/configurationStores@2022-05-01' existing = {
  scope: resourceGroup()
  name: 'ssoa-config'
}

resource containerGroup 'Microsoft.ContainerInstance/containerGroups@2021-10-01' = [for serviceName in serviceNames: {
  name: '${serviceName}-service'
  location: location
  properties: {
    containers: [
      {
        name: '${serviceName}-container'
        properties: {
          image: image
          command: [ '/mnt/ssoa-pt-grp7/startService.sh', '${serviceName}' ] 
          ports: [
            {
              port: port
              protocol: 'TCP'
            }
          ]
          resources: {
            requests: {
              cpu: cpuCores
              memoryInGB: memoryInGb
            }
          }
          volumeMounts:[
            {
              name: 'git-repo'
              mountPath: '/mnt'
            }
          ]
          environmentVariables:[
            {
              name:   'LOG_LEVEL'
              value:  'INFO'
            }
            {
              name:   'DATABASE_NAME'
              value:  databaseName
            }
            {
              name:   'APP_CONFIG_CONNECTION_STRING'
              value:  appConfig.listKeys().value[0].connectionString
            }
            {
              name:   'ACTIVATE_SWAGGER'
              value:  'true'
            }
          ]
        }
      }
    ]
    osType: 'Linux'
    restartPolicy: restartPolicy
    subnetIds: [
      {
        id: resourceId('Microsoft.Network/virtualNetworks/subnets', 'vnet', '${serviceName}Subnet')
      }
    ]
    ipAddress: {
      type: 'Private'
      ports: [
        {
          port: port
          protocol: 'TCP'
        }
      ]
    }
    volumes: [
      {
        name: 'git-repo'
        gitRepo:{
          repository: gitRepoUrl
        }
      }
    ]
  }
}]
