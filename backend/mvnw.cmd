@echo off
setlocal
set "MAVEN_PROJECTBASEDIR=%~dp0"
if "%MAVEN_PROJECTBASEDIR:~-1%"=="\" set "MAVEN_PROJECTBASEDIR=%MAVEN_PROJECTBASEDIR:~0,-1%"

set "WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"
set "WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain"

if not defined JAVA_HOME (
  set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
)

set "JAVACMD=%JAVA_HOME%\bin\java.exe"

if not exist "%JAVACMD%" (
  for %%i in (java.exe) do set "JAVACMD=%%~$PATH:i"
)

if not exist "%JAVACMD%" (
  echo Error: JAVA_HOME is not set and no 'java' command could be found in your PATH. 1>&2
  exit /b 1
)

"%JAVACMD%" -Dmaven.multiModuleProjectDirectory="%MAVEN_PROJECTBASEDIR%" -classpath "%WRAPPER_JAR%" %WRAPPER_LAUNCHER% %*
