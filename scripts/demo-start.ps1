<#
.SYNOPSIS
  HMS Unified Module Integration - Demonstration Startup Script
  Delegates directly to root demo-all.ps1 to launch all 3 tiers (NestJS API, Next.js Web, AI Voice Receptionist).
#>
$WorkspaceRoot = (Get-Item -Path $PSScriptRoot\..).FullName
& (Join-Path $WorkspaceRoot "demo-all.ps1")
