$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$checks = @(
    @{ Directory = 'backend'; Command = { & .\mvnw.cmd -B -ntp verify } },
    @{ Directory = 'web'; Command = { & npm.cmd run test:run -- --maxWorkers=1 } },
    @{ Directory = 'web'; Command = { & npm.cmd run build } },
    @{ Directory = 'mobile'; Command = { & npm.cmd run typecheck } },
    @{ Directory = 'mobile'; Command = { & npm.cmd run test:run -- --runInBand } }
)
foreach ($check in $checks) {
    Push-Location (Join-Path $taskRoot $check.Directory)
    try {
        & $check.Command
        if ($LASTEXITCODE -ne 0) { throw "Check failed in $($check.Directory), exit $LASTEXITCODE" }
    } finally { Pop-Location }
}
Write-Host 'Code checks passed. Browser E2E and installed APK acceptance are separate checks.'
