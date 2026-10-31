<#
.SYNOPSIS
  HealthPulse HMS / MediSlot - AI Voice Receptionist Client Demonstration Launcher
  Launches the interactive conversational clinical simulator with UTF-8 console output.
#>
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   HealthPulse HMS - AI Voice Receptionist Client Demo Simulator" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan

$AiDir = Join-Path $PSScriptRoot "ai-voice-receptionist"
$env:PYTHONPATH = $AiDir
Push-Location $AiDir
try {
    python scripts\demo_simulation.py
} finally {
    Pop-Location
}