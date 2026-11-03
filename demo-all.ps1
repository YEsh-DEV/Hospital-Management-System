<#
.SYNOPSIS
  HealthPulse HMS + AI Voice Receptionist - Full-Stack Client Demo Launcher
  Launches the NestJS API (4000), Next.js Web App (3000), and AI Voice Web Console (8000).
#>
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  HealthPulse HMS + AI Voice Receptionist - Full-Stack Demo Launcher" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan

$WorkspaceRoot = $PSScriptRoot
$ApiDir = Join-Path $WorkspaceRoot "apps\api"
$WebDir = Join-Path $WorkspaceRoot "apps\web"
$AiDir = Join-Path $WorkspaceRoot "ai-voice-receptionist"

if (-not (Test-Path "$ApiDir\.env")) { Copy-Item "$ApiDir\.env.example" "$ApiDir\.env" }
if (-not (Test-Path "$WebDir\.env.local")) { Copy-Item "$WebDir\.env.example" "$WebDir\.env.local" }
if (-not (Test-Path "$AiDir\.env")) { Copy-Item "$AiDir\.env.example" "$AiDir\.env" }

Write-Host "`n[1/3] Starting NestJS Authoritative API (Port 4000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ApiDir'; npm run dev"

Write-Host "[2/3] Starting Next.js Administrative Portal (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WebDir'; npm run dev"

Write-Host "[3/3] Starting AI Voice Receptionist Web Simulator (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$AiDir'; `$env:PYTHONPATH='.'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "  SYSTEM READY FOR DEMONSTRATION!" -ForegroundColor Green
Write-Host "  Web Portal       : http://localhost:3000" -ForegroundColor White
Write-Host "  AI Voice Demo    : http://localhost:8000/demo" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
Start-Process "http://localhost:8000/demo"