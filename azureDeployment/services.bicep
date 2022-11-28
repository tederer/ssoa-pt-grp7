param location      string
param databaseName  string

var image               = 'node:lts-alpine'
var port                = 80
var cpuCores            = 1
var memoryInGb          = 1
var restartPolicy       = 'Always'
var gitRepoUrl          = 'https://github.com/tederer/ssoa-pt-grp7.git'
var serviceNames        = ['webserver', 'products']

/** TODO
resource databaseAccount 'Microsoft.DocumentDB/databaseAccounts@2022-05-15' existing = {
  scope: resourceGroup()
  name: 'db-account-for-ssoa-pt-grp7'
}
*/

resource vnetSubnet 'Microsoft.Network/virtualNetworks/subnets@2022-05-01' existing = {
  scope: resourceGroup()
  name: 'vnet/servicesSubnet'
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
            /*{ TODO
              name:   'DATABASE_CONNECTION_STRING'
              value:  databaseAccount.listConnectionStrings().connectionStrings[0].connectionString
            }*/
            {
              name:   'DATABASE_NAME'
              value:  databaseName
            }
          ]
        }
      }
    ]
    osType: 'Linux'
    restartPolicy: restartPolicy
    subnetIds: [
      {
        id: vnetSubnet.id
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
