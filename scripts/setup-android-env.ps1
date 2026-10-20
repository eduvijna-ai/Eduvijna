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

$previousErrorActionPreference = $ErrorActionPreference

try {
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
      $sdkManager = Join-Path $binDir "sdkmanager.bat"
      $avdManager = Join-Path $binDir "avdmanager.bat"
      if ((Test-Path -LiteralPath $sdkManager) -and (Test-Path -LiteralPath $avdManager)) {
        return $binDir
      }
    }

    throw "Android SDK cmdline-tools not found under $SdkRoot. A candidate directory must contain both sdkmanager.bat and avdmanager.bat (incomplete latest/flat installs are skipped). Install Command-line Tools via Android Studio SDK Manager."
  }

  if ([string]::IsNullOrWhiteSpace($SdkPath)) {
    throw "SdkPath is empty. Pass -SdkPath or set LOCALAPPDATA."
  }

  Test-ExecutablePath -Path (Join-Path $JdkPath "bin\java.exe") -Label "JDK 17 (java.exe)"
  Test-ExecutablePath -Path (Join-Path $SdkPath "platform-tools\adb.exe") -Label "Android SDK platform-tools (adb.exe)"
  Test-ExecutablePath -Path (Join-Path $SdkPath "emulator\emulator.exe") -Label "Android emulator (emulator.exe)"

  $script:EduvijnaCmdlineBin = Resolve-CmdlineToolsBin -SdkRoot $SdkPath
  $script:EduvijnaSdkPath = $SdkPath

  $env:JAVA_HOME = $JdkPath
  $env:ANDROID_HOME = $SdkPath
  $env:ANDROID_SDK_ROOT = $SdkPath

  $prepend = @(
    (Join-Path $JdkPath "bin"),
    (Join-Path $SdkPath "platform-tools"),
    (Join-Path $SdkPath "emulator"),
    $script:EduvijnaCmdlineBin
  )

  $existingPath = @()
  if ($env:Path) {
    $existingPath = $env:Path -split ';' | Where-Object { $_ -ne '' }
  }

  $env:Path = (($prepend + $existingPath) | Select-Object -Unique) -join ';'

  function sdkmanager {
    & (Join-Path $script:EduvijnaCmdlineBin 'sdkmanager.bat') --sdk_root=$script:EduvijnaSdkPath @args
  }

  function avdmanager {
    $avdManagerBat = Join-Path $script:EduvijnaCmdlineBin 'avdmanager.bat'
    if ($MyInvocation.ExpectingInput) {
      $input | & $avdManagerBat @args
    } else {
      & $avdManagerBat @args
    }
  }

  Write-Host "JAVA_HOME=$env:JAVA_HOME"
  Write-Host "ANDROID_SDK_ROOT=$env:ANDROID_SDK_ROOT"
  Write-Host "ANDROID_CMDLINE_TOOLS_BIN=$script:EduvijnaCmdlineBin"
  Write-Host "Tip: dot-sourced sdkmanager presets --sdk_root; avdmanager uses ANDROID_SDK_ROOT. Re-dot-source in each new PowerShell window."
}
finally {
  $ErrorActionPreference = $previousErrorActionPreference
}
