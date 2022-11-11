param location string

var image               = 'node:lts-alpine'
var port                = 80
var cpuCores            = 1
var memoryInGb          = 1
var restartPolicy       = 'Always'
var gitRepoUrl          = 'https://github.com/tederer/ssoa-pt-grp7.git'
var serviceNames        = ['webserver', 'products']

resource containerGroup 'Microsoft.ContainerInstance/containerGroups@2021-10-01' = [for serviceName in serviceNames: {
  name: serviceName
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
              name:  'LOG_LEVEL'
              value: 'INFO'
            } 
          ]
        }
      }
    ]
    osType: 'Linux'
    restartPolicy: restartPolicy
    ipAddress: {
      type: 'Public'
      dnsNameLabel: 'ssoaptgrp7-${serviceName}'
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
}]
