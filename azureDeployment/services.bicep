param location string

var image               = 'node:lts-alpine'
var port                = 80
var cpuCores            = 1
var memoryInGb          = 1
var restartPolicy       = 'Always'
var gitRepoUrl          = 'https://github.com/tederer/ssoa-pt-grp7.git'

resource webserverContainerGroup 'Microsoft.ContainerInstance/containerGroups@2021-10-01' = {
  name: 'webserver'
  location: location
  properties: {
    containers: [
      {
        name: 'webserver-container'
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
      dnsNameLabel: 'ssoaptgrp7-webserver'
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

output containerIPv4Address string = webserverContainerGroup.properties.ipAddress.ip
