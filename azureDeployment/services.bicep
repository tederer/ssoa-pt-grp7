param location string

param containerGroupName string = 'services'
param containerName string      = 'webserver'
param image string              = 'node:lts-alpine'
param port int                  = 80
param cpuCores int              = 1
param memoryInGb int            = 1
param restartPolicy string      = 'Always'
param gitRepoUrl string         = 'https://github.com/tederer/ssoa-pt-grp7.git'

resource windsensorContainerGroup 'Microsoft.ContainerInstance/containerGroups@2021-10-01' = {
  name: containerGroupName
  location: location
  properties: {
    containers: [
      {
        name: containerName
        properties: {
          image: image
          command: [ '/mnt/ssoa-pt-grp7/startService.sh', 'webserver' ] 
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
        }
      }
    ]
    osType: 'Linux'
    restartPolicy: restartPolicy
    ipAddress: {
      type: 'Public'
      ports: [
        {
          port: port
          protocol: 'TCP'
        }
      ]
    }
    volumes:[
      {
        name: 'git-repo'
        gitRepo:{
          repository: gitRepoUrl
        }
      }
    ]
  }
}

output containerIPv4Address string = windsensorContainerGroup.properties.ipAddress.ip
