# Eduvijna — Android toolchain environment (Windows). Dot-source in PowerShell:
#   . .\scripts\setup-android-env.ps1
#
# Preserves existing PATH entries; sets JDK 17 + Android SDK tools.

$Jdk17 = "C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot"
$AndroidSdk = "$env:LOCALAPPDATA\Android\Sdk"

if (-not (Test-Path $Jdk17)) {
  Write-Error "JDK 17 not found at $Jdk17. Install Eclipse Temurin 17 or update this script."
}

if (-not (Test-Path "$AndroidSdk\platform-tools\adb.exe")) {
  Write-Error "Android SDK not found at $AndroidSdk."
}

$env:JAVA_HOME = $Jdk17
$env:ANDROID_HOME = $AndroidSdk
$env:ANDROID_SDK_ROOT = $AndroidSdk

$prepend = @(
  "$env:JAVA_HOME\bin",
  "$AndroidSdk\platform-tools",
  "$AndroidSdk\emulator",
  "$AndroidSdk\cmdline-tools\bin"
)

$env:Path = (($prepend + ($env:Path -split ';')) | Select-Object -Unique) -join ';'

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_SDK_ROOT=$env:ANDROID_SDK_ROOT"
