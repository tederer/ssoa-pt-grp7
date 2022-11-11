#!/bin/sh

scriptDir=$(cd $(dirname $0) && pwd)
serviceName=$1

if [ "$serviceName" == "" ]; then
   echo "ERROR: Missing service name. Please provide it as first argument."
   exit 1
fi

cd "$scriptDir"

serviceConfig=$(grep "${serviceName}=" services.cfg)
exitCode=$?
if [ $exitCode -ne 0 ]; then
   echo "ERROR: service \"$serviceName\" does not exist in config file"
   exit 1
fi
serviceExecutable=$(echo $serviceConfig | cut -d '=' -f 2)

if [ ! -d ./node_modules ]; then
   npm install
fi

node $serviceExecutable