@echo off
chcp 65001 >nul
title HealthPulse HMS - AI Voice Receptionist Client Demo Simulator
echo ======================================================================
echo    HealthPulse HMS / MediSlot - AI Voice Receptionist Client Demo
echo ======================================================================
echo Launching Interactive Clinical Voice Simulation...
echo.
cd /d "%~dp0ai-voice-receptionist"
set PYTHONPATH=.
python scripts\demo_simulation.py
pause