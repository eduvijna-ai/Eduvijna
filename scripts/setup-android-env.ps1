# Eduvijna — Android toolchain environment (Windows).
# Dot-source in PowerShell (does not persist after the session closes):
#   . .\scripts\setup-android-env.ps1
# Optional overrides:
#   . .\scripts\setup-android-env.ps1 -JdkPath "D:\jdk-17" -SdkPath "D:\Android\Sdk"

[CmdletBinding()]
param(
  [string]$JdkPath = "C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot",
  [string]$SdkPath = $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "Android\Sdk" } else { "" })
)

$ErrorActionPreference = 'Stop'

function Test-ExecutablePath {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Label
  )
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$Label not found at: $Path"
  }
}

function Resolve-CmdlineToolsBin {
  param([Parameter(Mandatory = $true)][string]$SdkRoot)

  $candidates = @(
    (Join-Path $SdkRoot "cmdline-tools\latest\bin"),
    (Join-Path $SdkRoot "cmdline-tools\bin")
  )

  $cmdlineRoot = Join-Path $SdkRoot "cmdline-tools"
  if (Test-Path -LiteralPath $cmdlineRoot) {
    Get-ChildItem -LiteralPath $cmdlineRoot -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '^\d' } |
      ForEach-Object { $candidates += (Join-Path $_.FullName "bin") }
  }

  foreach ($binDir in ($candidates | Select-Object -Unique)) {
    if (Test-Path -LiteralPath (Join-Path $binDir "sdkmanager.bat")) {
      return $binDir
    }
  }

  throw "Android SDK cmdline-tools not found under $SdkRoot. Install Command-line Tools (sdkmanager/avdmanager) via Android Studio SDK Manager."
}

if ([string]::IsNullOrWhiteSpace($SdkPath)) {
  throw "SdkPath is empty. Pass -SdkPath or set LOCALAPPDATA."
}

Test-ExecutablePath -Path (Join-Path $JdkPath "bin\java.exe") -Label "JDK 17 (java.exe)"
Test-ExecutablePath -Path (Join-Path $SdkPath "platform-tools\adb.exe") -Label "Android SDK platform-tools (adb.exe)"
Test-ExecutablePath -Path (Join-Path $SdkPath "emulator\emulator.exe") -Label "Android emulator (emulator.exe)"

$cmdlineBin = Resolve-CmdlineToolsBin -SdkRoot $SdkPath

$env:JAVA_HOME = $JdkPath
$env:ANDROID_HOME = $SdkPath
$env:ANDROID_SDK_ROOT = $SdkPath

$prepend = @(
  (Join-Path $JdkPath "bin"),
  (Join-Path $SdkPath "platform-tools"),
  (Join-Path $SdkPath "emulator"),
  $cmdlineBin
)

$existingPath = @()
if ($env:Path) {
  $existingPath = $env:Path -split ';' | Where-Object { $_ -ne '' }
}

$env:Path = (($prepend + $existingPath) | Select-Object -Unique) -join ';'

function sdkmanager {
  & (Join-Path $cmdlineBin 'sdkmanager.bat') --sdk_root=$SdkPath @args
}

function avdmanager {
  & (Join-Path $cmdlineBin 'avdmanager.bat') --sdk_root=$SdkPath @args
}

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_SDK_ROOT=$env:ANDROID_SDK_ROOT"
Write-Host "ANDROID_CMDLINE_TOOLS_BIN=$cmdlineBin"
Write-Host "Tip: use sdkmanager / avdmanager functions (sdk_root preset) when cmdline-tools are not under latest\."
