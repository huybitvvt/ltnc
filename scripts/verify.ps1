# scripts/verify.ps1
# Script kiểm tra tổng hợp toàn bộ các ứng dụng TroHub
$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  TroHub System Verification Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$allPass = $true

# 1. Web Typecheck & Build
Write-Host "`n[1/3] Kiểm tra Frontend Web (React + TypeScript + Vite)..." -ForegroundColor Yellow
Push-Location "web"
cmd /c npm.cmd run typecheck
$webTypecheckExit = $LASTEXITCODE
if ($webTypecheckExit -ne 0) {
    Write-Host "[-] Web typecheck FAILED!" -ForegroundColor Red
    $allPass = $false
} else {
    Write-Host "[+] Web typecheck PASSED!" -ForegroundColor Green
}

cmd /c npm.cmd run build
$webBuildExit = $LASTEXITCODE
if ($webBuildExit -ne 0) {
    Write-Host "[-] Web build FAILED!" -ForegroundColor Red
    $allPass = $false
} else {
    Write-Host "[+] Web build PASSED!" -ForegroundColor Green
}
Pop-Location

# 2. Mobile Typecheck
Write-Host "`n[2/3] Kiểm tra Mobile App (React Native + Expo)..." -ForegroundColor Yellow
Push-Location "mobile"
cmd /c npm.cmd run typecheck
$mobileTypecheckExit = $LASTEXITCODE
if ($mobileTypecheckExit -ne 0) {
    Write-Host "[-] Mobile typecheck FAILED!" -ForegroundColor Red
    $allPass = $false
} else {
    Write-Host "[+] Mobile typecheck PASSED!" -ForegroundColor Green
}
Pop-Location

# 3. Backend Test-Compile
Write-Host "`n[3/3] Kiểm tra Backend (Spring Boot + Java 17)..." -ForegroundColor Yellow
Push-Location "backend"
cmd /c .\mvnw.cmd test-compile
$backendCompileExit = $LASTEXITCODE
if ($backendCompileExit -ne 0) {
    Write-Host "[-] Backend compile FAILED!" -ForegroundColor Red
    $allPass = $false
} else {
    Write-Host "[+] Backend compile PASSED!" -ForegroundColor Green
}

Write-Host "`n[3b/3] Chạy Unit Tests Backend (Auth + User + Property + Tenancy + Pricing + Metering + Billing + Payments + Deposits + Operations + Notifications + Reporting)..." -ForegroundColor Yellow
cmd /c .\mvnw.cmd test "-Dtest=AuthServiceTest,UserServiceTest,PropertyServiceTest,TenancyServiceTest,PricingServiceTest,MeteringServiceTest,BillingServiceTest,PaymentServiceTest,DepositServiceTest,OperationsServiceTest,NotificationServiceTest,ReportingServiceTest"
$backendTestExit = $LASTEXITCODE
if ($backendTestExit -ne 0) {
    Write-Host "[-] Backend unit tests FAILED!" -ForegroundColor Red
    $allPass = $false
} else {
    Write-Host "[+] Backend unit tests PASSED!" -ForegroundColor Green
}
Pop-Location

Write-Host "`n==========================================" -ForegroundColor Cyan
if ($allPass) {
    Write-Host "  TỔNG KẾT: TẤT CẢ CÁC THÀNH PHẦN ĐẠT (PASS)!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "  TỔNG KẾT: CÓ THÀNH PHẦN THẤT BẠI (FAIL)!" -ForegroundColor Red
    exit 1
}
