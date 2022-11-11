@echo off

set PROJECT_ROOT=%cd%

rem    The following two variables need to be set if the installation folders are not part of the PATH environment variable.
set NODE_HOME=C:\Software\Node.js\current
set GIT_HOME=C:\Software\git\current

set GRUNT_HOME=%PROJECT_ROOT%\node_modules\.bin

node --version > nul 2>&1

if errorlevel 1 (
	if not exist %NODE_HOME% (
		echo.
		echo ERROR: Neither PATH nor NODE_HOME environment variable points to installation folder of Node.js!
		echo.
		pause
		exit 1
	) else (
	   set "PATH=%PATH%;%NODE_HOME%"
	)
)
git --version > nul 2>&1

if errorlevel 1 (
	if not exist %GIT_HOME% (
		echo.
		echo ERROR: Neither PATH nor GIT_HOME environment variable points to installation folder of Git!
		echo.
		pause
		exit 1
	) else (
		set "PATH=%PATH%;%GIT_HOME%"
	)
)

echo "--1"
echo "%GRUNT_HOME%"

if not exist "%GRUNT_HOME%" (
   echo "--2"
   echo Home folder "%GRUNT_HOME%" of grunt does not exist! Did you forget to run 'npm install'?
   pause
) else (
	set "PATH=%PATH%;%GRUNT_HOME%"
)

exit /b 0