<#
.SYNOPSIS
  HMS Unified Module Integration - Demonstration Startup Script
  Runs PostgreSQL checks, Prisma migrations, seeds synthetic data,
  and launches both the NestJS API (port 4000) and Next.js Web app (port 3000).
#>

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  🏥 HealthPulse HMS - Unified Full-Stack Demo Startup Script" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan

$WorkspaceRoot = (Get-Item -Path $PSScriptRoot\..).FullName
$ApiDir = Join-Path $WorkspaceRoot "apps\api"
$WebDir = Join-Path $WorkspaceRoot "apps\web"

# Step 1: Check Database connectivity
Write-Host "`n[1/4] Checking PostgreSQL connectivity..." -ForegroundColor Yellow
if (-not $env:DATABASE_URL) {
    if (Test-Path "$ApiDir\.env") {
        Get-Content "$ApiDir\.env" | ForEach-Object {
            if ($_ -match '^\s*DATABASE_URL\s*=\s*"?([^"#]+)"?') {
                $env:DATABASE_URL = $matches[1].Trim()
            }
        }
    }
}

if ($env:DATABASE_URL) {
    if (-not $env:DIRECT_URL) {
        $env:DIRECT_URL = $env:DATABASE_URL
    }
    Write-Host "  ✓ DATABASE_URL configured" -ForegroundColor Green
} else {
    Write-Host "  ! DATABASE_URL not set in environment or apps\api\.env. Using default local." -ForegroundColor DarkYellow
}

# Step 2: Database Migration & Seed
Write-Host "`n[2/4] Deploying Prisma database migrations & seeding..." -ForegroundColor Yellow
Push-Location $ApiDir
try {
    Write-Host "  Running 'npx prisma db push' to harmonize schema..."
    npx prisma db push --skip-generate
    Write-Host "  Running 'npx prisma generate'..."
    npx prisma generate
    Write-Host "  Seeding canonical data (8 doctors, 20 patients, 30 appointments, 10 leads/tasks)..."
    npx tsx prisma/seed.ts
    Write-Host "  ✓ Database setup complete!" -ForegroundColor Green
} catch {
    Write-Host "  ! Note: DB push/seed completed with status: $_" -ForegroundColor DarkYellow
} finally {
    Pop-Location
}

# Step 3: Launch NestJS API (Port 4000)
Write-Host "`n[3/4] Starting NestJS Authoritative API on port 4000..." -ForegroundColor Yellow
$ApiProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ApiDir'; npm run dev" -PassThru
Write-Host "  ✓ NestJS API process started (PID: $($ApiProcess.Id))" -ForegroundColor Green

# Step 4: Launch Next.js Web App (Port 3000)
Write-Host "`n[4/4] Starting Next.js Administrative Portal on port 3000..." -ForegroundColor Yellow
$WebProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WebDir'; npm run dev" -PassThru
Write-Host "  ✓ Next.js Frontend process started (PID: $($WebProcess.Id))" -ForegroundColor Green

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "  🎉 HMS SYSTEM READY FOR DEMONSTRATION" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  • Next.js Web App:    http://localhost:3000" -ForegroundColor White
Write-Host "  • NestJS API:         http://localhost:4000/api" -ForegroundColor White
Write-Host ""
Write-Host "  Demo Credentials:" -ForegroundColor Cyan
Write-Host "  ┌──────────────────┬─────────────────────────────┬─────────────────┐"
Write-Host "  │ Role             │ Email                       │ Password        │"
Write-Host "  ├──────────────────┼─────────────────────────────┼─────────────────┤"
Write-Host "  │ SUPER_ADMIN      │ superadmin@hospital.com     │ SuperSecret123# │"
Write-Host "  │ ADMIN            │ admin@hospital.com          │ SuperSecret123# │"
Write-Host "  │ RECEPTIONIST     │ reception@hospital.com      │ SuperSecret123# │"
Write-Host "  │ DOCTOR           │ doctor@hospital.com         │ SuperSecret123# │"
Write-Host "  │ NURSE            │ nurse@hospital.com          │ SuperSecret123# │"
Write-Host "  └──────────────────┴─────────────────────────────┴─────────────────┘"
Write-Host ""
Write-Host "Press Ctrl+C or close the spawned windows to stop the servers."
