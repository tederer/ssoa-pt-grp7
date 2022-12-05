#!/bin/sh

# using /bin/sh because the alpine docker image does not support /bin/bash

cd $(dirname $0)
scriptDir=$(pwd)
serviceName=$1
configFile=$scriptDir/services.cfg

if test "$serviceName" = "" ; then
   echo "ERROR: Missing service name. Please provide it as first argument."
   exit 1
fi

if test ! -e $configFile ; then
   echo "ERROR: configuration file ($configFile) does not exist."
   exit 1
fi

cd "$scriptDir"

serviceConfig=$(cat $configFile | tr -d '\r' | grep "${serviceName}=")
exitCode=$?
if test $exitCode -ne 0 ; then
   echo "ERROR: service \"$serviceName\" does not exist in config file"
   exit 1
fi

serviceExecutable=$(echo -n $serviceConfig | cut -d '=' -f 2)

if test ! -d ./node_modules ; then
   npm install
fi

node $scriptDir/$serviceExecutable
