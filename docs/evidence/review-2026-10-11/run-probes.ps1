$ErrorActionPreference = 'Stop'
$reviewProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$reviewXmlPath = Join-Path $reviewProjectRoot 'backend\target\surefire-reports\TEST-vn.trohub.billing.application.PaymentServiceTest.xml'
if (!(Test-Path -LiteralPath $reviewXmlPath)) {
    throw 'Chạy backend\mvnw.cmd test trước để tạo classes và Surefire report.'
}
[xml]$reviewXml = Get-Content -LiteralPath $reviewXmlPath
$reviewClassPath = ($reviewXml.testsuite.properties.property | Where-Object name -eq 'java.class.path').value
$reviewJavaCommand = Get-Command java -ErrorAction SilentlyContinue
if ($reviewJavaCommand) {
    $reviewJavaPath = $reviewJavaCommand.Source
} elseif ($env:JAVA_HOME -and (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    $reviewJavaPath = Join-Path $env:JAVA_HOME 'bin\java.exe'
} else {
    $reviewJavaPath = 'C:\Program Files\Android\Android Studio\jbr\bin\java.exe'
}
if (!(Test-Path -LiteralPath $reviewJavaPath)) {
    throw 'Cần JDK có hỗ trợ Java source launcher; cấu hình JAVA_HOME.'
}
& $reviewJavaPath '-Dnet.bytebuddy.experimental=true' '-XX:+EnableDynamicAgentLoading' '-classpath' $reviewClassPath (Join-Path $PSScriptRoot 'ReviewProbe.java')
exit $LASTEXITCODE
