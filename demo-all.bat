@echo off
TITLE HealthPulse HMS + AI Voice Receptionist - Full-Stack Client Demo
COLOR 0B

echo ======================================================================
echo    HealthPulse HMS + AI Voice Receptionist - Full-Stack Client Demo
echo ======================================================================
echo.
echo Starting 3 Services:
echo   1. NestJS Authoritative API Server      : http://localhost:4000/api
echo   2. Next.js Administrative & Doctor Web   : http://localhost:3000
echo   3. AI Voice Receptionist Client Console  : http://localhost:8000/demo
echo.

set ROOT=%~dp0
set API_DIR=%ROOT%apps\api
set WEB_DIR=%ROOT%apps\web
set AI_DIR=%ROOT%ai-voice-receptionist

if not exist "%API_DIR%\.env" copy "%API_DIR%\.env.example" "%API_DIR%\.env" >nul
if not exist "%WEB_DIR%\.env.local" copy "%WEB_DIR%\.env.example" "%WEB_DIR%\.env.local" >nul
if not exist "%AI_DIR%\.env" copy "%AI_DIR%\.env.example" "%AI_DIR%\.env" >nul

echo [1/3] Starting NestJS Authoritative API on port 4000...
start "HMS NestJS API (Port 4000)" cmd /k "cd /d "%API_DIR%" && npm run dev"

echo [2/3] Starting Next.js Administrative Web Portal on port 3000...
start "HMS Next.js Web (Port 3000)" cmd /k "cd /d "%WEB_DIR%" && npm run dev"

echo [3/3] Starting AI Voice Receptionist Service on port 8000...
start "HealthPulse AI Voice Receptionist (Port 8000)" cmd /k "cd /d "%AI_DIR%" && set PYTHONPATH=. && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo ======================================================================
echo   ALL 3 TIERS LAUNCHING!
echo.
echo   - Web Portal       : http://localhost:3000
echo   - AI Voice Demo    : http://localhost:8000/demo
echo.
echo   Demo Login Personas:
echo     Super Admin : superadmin@hospital.com  /  SuperSecret123#
echo     Admin       : admin@hospital.com       /  SuperSecret123#
echo     Receptionist: reception@hospital.com   /  SuperSecret123#
echo     Doctor      : doctor@hospital.com      /  SuperSecret123#
echo ======================================================================
echo.
timeout /t 4 >nul
start http://localhost:3000
start http://localhost:8000/demo
pause