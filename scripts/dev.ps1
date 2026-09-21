# scripts/dev.ps1
# Script khởi động môi trường phát triển TroHub
param(
    [string]$Target = "all" # all, db, backend, web, mobile
)

$ErrorActionPreference = "Stop"

if ($Target -eq "db") {
    Write-Host "[+] Khởi động PostgreSQL 16 trong Docker Compose..." -ForegroundColor Cyan
    docker compose -f infra/compose.yaml up -d db
} elseif ($Target -eq "backend") {
    Write-Host "[+] Chạy Backend Spring Boot (profile local)..." -ForegroundColor Cyan
    Set-Location backend
    cmd /c .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
} elseif ($Target -eq "web") {
    Write-Host "[+] Chạy Web Dev Server..." -ForegroundColor Cyan
    Set-Location web
    cmd /c npm.cmd run dev
} elseif ($Target -eq "mobile") {
    Write-Host "[+] Chạy Mobile Metro Server..." -ForegroundColor Cyan
    Set-Location mobile
    cmd /c npx.cmd expo start
} else {
    Write-Host "Sử dụng: .\scripts\dev.ps1 -Target [db|backend|web|mobile]" -ForegroundColor Yellow
}
