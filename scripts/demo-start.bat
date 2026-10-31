@echo off
TITLE HealthPulse HMS - Unified Integration Demo Launcher
COLOR 0A

echo ======================================================================
echo   HealthPulse HMS - Unified Integration Demo Launcher
echo ======================================================================

set SCRIPT_DIR=%~dp0
set WORKSPACE_ROOT=%SCRIPT_DIR%..
set API_DIR=%WORKSPACE_ROOT%\apps\api
set WEB_DIR=%WORKSPACE_ROOT%\apps\web

echo [1/3] Synchronizing PostgreSQL Database Models...
cd /d "%API_DIR%"
call npx prisma db push --skip-generate
call npx prisma generate
call npx tsx prisma/seed.ts

echo.
echo [2/3] Starting NestJS API on http://localhost:4000...
start "HMS NestJS API (Port 4000)" cmd /k "cd /d "%API_DIR%" && npm run dev"

echo.
echo [3/3] Starting Next.js Web on http://localhost:3000...
start "HMS Next.js Web (Port 3000)" cmd /k "cd /d "%WEB_DIR%" && npm run dev"

echo.
echo ======================================================================
echo   Demo Ready!
echo   Open: http://localhost:3000
echo   Credentials:
echo     Email:    admin@hospital.com
echo     Password: SuperSecret123#
echo ======================================================================
pause
