# Isolated fixtures for setup-android-env.ps1.
# Does not inspect, start, or stop a host emulator / real Android SDK.
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-android-env.tests.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$setupScript = Join-Path $PSScriptRoot 'setup-android-env.ps1'
$failed = 0

function Write-Fail {
  param([string]$Message)
  $script:failed++
  Write-Host "FAIL: $Message" -ForegroundColor Red
}

function Write-Pass {
  param([string]$Message)
  Write-Host "PASS: $Message" -ForegroundColor Green
}

function New-EmptyFile {
  param([string]$Path)
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  New-Item -ItemType File -Path $Path -Force | Out-Null
}

function New-FakeSdkLayout {
  param(
    [Parameter(Mandatory = $true)][string]$Root,
    [switch]$LatestSdkOnly,
    [switch]$LatestComplete,
    [switch]$VersionedComplete,
    [string]$VersionName = '13.0'
  )

  $jdk = Join-Path $Root 'jdk'
  New-EmptyFile (Join-Path $jdk 'bin\java.exe')

  $sdk = Join-Path $Root 'sdk'
  New-EmptyFile (Join-Path $sdk 'platform-tools\adb.exe')
  New-EmptyFile (Join-Path $sdk 'emulator\emulator.exe')

  if ($LatestSdkOnly) {
    New-EmptyFile (Join-Path $sdk 'cmdline-tools\latest\bin\sdkmanager.bat')
  }
  if ($LatestComplete) {
    $latestBin = Join-Path $sdk 'cmdline-tools\latest\bin'
    New-EmptyFile (Join-Path $latestBin 'sdkmanager.bat')
    New-EmptyFile (Join-Path $latestBin 'avdmanager.bat')
  }
  if ($VersionedComplete) {
    $versionBin = Join-Path $sdk "cmdline-tools\$VersionName\bin"
    New-EmptyFile (Join-Path $versionBin 'sdkmanager.bat')
    $avdBat = Join-Path $versionBin 'avdmanager.bat'
    $capturePs1 = Join-Path $versionBin 'avdmanager-capture.ps1'
    @"
param(
  [Parameter(ValueFromRemainingArguments = `$true)]
  [string[]]`$BatArgs
)
`$stdinPath = Join-Path `$PSScriptRoot 'captured-stdin.txt'
`$argsPath = Join-Path `$PSScriptRoot 'captured-args.txt'
`$raw = [Console]::In.ReadToEnd()
Set-Content -LiteralPath `$stdinPath -Value `$raw -Encoding ascii
Set-Content -LiteralPath `$argsPath -Value (`$BatArgs -join ' ') -Encoding ascii
"@ | Set-Content -LiteralPath $capturePs1 -Encoding ascii
    @"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0avdmanager-capture.ps1" %*
"@ | Set-Content -LiteralPath $avdBat -Encoding ascii
  }

  return @{
    JdkPath = $jdk
    SdkPath = $sdk
  }
}

function Invoke-SetupInIsolatedProcess {
  param(
    [Parameter(Mandatory = $true)][string]$JdkPath,
    [Parameter(Mandatory = $true)][string]$SdkPath,
    [string]$AfterSetup = ''
  )

  $tempScript = Join-Path ([System.IO.Path]::GetTempPath()) ("eduvijna-env-probe-" + [guid]::NewGuid().ToString('N') + '.ps1')
  $setupLiteral = $setupScript.Replace("'", "''")
  $jdkLiteral = $JdkPath.Replace("'", "''")
  $sdkLiteral = $SdkPath.Replace("'", "''")
  @(
    '$ErrorActionPreference = ''Stop'''
    ". '$setupLiteral' -JdkPath '$jdkLiteral' -SdkPath '$sdkLiteral'"
    $AfterSetup
  ) | Set-Content -LiteralPath $tempScript -Encoding UTF8
  try {
    $previousEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      $output = & powershell.exe -NoProfile -File $tempScript 2>&1 | Out-String
      $code = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousEap
    }
    return @{
      ExitCode = $code
      Output = $output
    }
  } finally {
    Remove-Item -LiteralPath $tempScript -Force -ErrorAction SilentlyContinue
  }
}

$scratch = Join-Path ([System.IO.Path]::GetTempPath()) ("eduvijna-android-env-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $scratch -Force | Out-Null

try {
  # Incomplete latest must be skipped in favor of a complete versioned install.
  $skipIncomplete = Join-Path $scratch 'skip-incomplete'
  $paths = New-FakeSdkLayout -Root $skipIncomplete -LatestSdkOnly -VersionedComplete
  $expectedBin = Join-Path $paths.SdkPath 'cmdline-tools\13.0\bin'
  $probe = Invoke-SetupInIsolatedProcess -JdkPath $paths.JdkPath -SdkPath $paths.SdkPath -AfterSetup @'
Write-Output "BIN=$script:EduvijnaCmdlineBin"
'@
  if ($probe.Output -match [regex]::Escape("BIN=$expectedBin")) {
    Write-Pass 'skips incomplete latest (sdkmanager.bat only) and selects versioned dir with both bats'
  } else {
    Write-Fail "expected BIN=$expectedBin; got: $($probe.Output)"
  }

  # Complete latest is preferred over a later versioned candidate.
  $preferLatest = Join-Path $scratch 'prefer-latest'
  $pathsLatest = New-FakeSdkLayout -Root $preferLatest -LatestComplete -VersionedComplete
  $expectedLatest = Join-Path $pathsLatest.SdkPath 'cmdline-tools\latest\bin'
  $probeLatest = Invoke-SetupInIsolatedProcess -JdkPath $pathsLatest.JdkPath -SdkPath $pathsLatest.SdkPath -AfterSetup @'
Write-Output "BIN=$script:EduvijnaCmdlineBin"
'@
  if ($probeLatest.Output -match [regex]::Escape("BIN=$expectedLatest")) {
    Write-Pass 'selects complete latest when both sdkmanager.bat and avdmanager.bat exist'
  } else {
    Write-Fail "expected BIN=$expectedLatest; got: $($probeLatest.Output)"
  }

  # No complete candidate → terminating error.
  $onlyIncomplete = Join-Path $scratch 'only-incomplete'
  $pathsBad = New-FakeSdkLayout -Root $onlyIncomplete -LatestSdkOnly
  $probeBad = Invoke-SetupInIsolatedProcess -JdkPath $pathsBad.JdkPath -SdkPath $pathsBad.SdkPath
  if ($probeBad.ExitCode -ne 0 -and $probeBad.Output -match 'sdkmanager.bat and avdmanager.bat') {
    Write-Pass 'throws when every cmdline-tools candidate is missing avdmanager.bat'
  } else {
    Write-Fail "expected terminating incomplete-tools error; exit=$($probeBad.ExitCode) output=$($probeBad.Output)"
  }

  # Pipeline input is forwarded through the avdmanager wrapper.
  $pipelineRoot = Join-Path $scratch 'pipeline'
  $pathsPipe = New-FakeSdkLayout -Root $pipelineRoot -VersionedComplete
  $captureFile = Join-Path $pathsPipe.SdkPath 'cmdline-tools\13.0\bin\captured-stdin.txt'
  $probePipe = Invoke-SetupInIsolatedProcess -JdkPath $pathsPipe.JdkPath -SdkPath $pathsPipe.SdkPath -AfterSetup @'
'no' | avdmanager create avd -n Eduvijna_Android_Dev -k "system-images;android-36;google_apis_playstore;x86_64" -d pixel
'@
  $captured = ''
  if (Test-Path -LiteralPath $captureFile) {
    $captured = (Get-Content -LiteralPath $captureFile -Raw)
  }
  if ($probePipe.ExitCode -eq 0 -and $captured -match 'no') {
    Write-Pass 'forwards pipeline input (echo no) through avdmanager wrapper'
  } else {
    Write-Fail "pipeline capture failed; exit=$($probePipe.ExitCode) captured='$captured' output=$($probePipe.Output)"
  }
}
finally {
  Remove-Item -LiteralPath $scratch -Recurse -Force -ErrorAction SilentlyContinue
}

if ($failed -gt 0) {
  Write-Host "$failed fixture check(s) failed." -ForegroundColor Red
  exit 1
}

Write-Host 'All isolated Android env fixture checks passed.' -ForegroundColor Green
exit 0
