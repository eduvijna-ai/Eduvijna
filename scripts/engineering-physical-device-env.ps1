# Bind PR26 physical-device validation to one USB phone (local serial in .engineering-physical-device.local.json).
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $repoRoot '.engineering-physical-device.local.json'
if (-not (Test-Path $configPath)) {
  throw "Missing $configPath — create {\"serial\":\"YOUR_ADB_SERIAL\"}"
}
$cfg = Get-Content $configPath -Raw | ConvertFrom-Json
$serial = $cfg.serial
if (-not $serial) { throw 'config.serial is required' }

$env:ENGINEERING_PHYSICAL_DEVICE = '1'
$env:ENGINEERING_ADB_SERIAL = $serial
$env:ADB_DEVICE = $serial
$env:ANDROID_SERIAL = $serial
$javaHome = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot'
if (Test-Path $javaHome) { $env:JAVA_HOME = $javaHome }

Write-Host "ENGINEERING_PHYSICAL_DEVICE=1 serial=$serial"
