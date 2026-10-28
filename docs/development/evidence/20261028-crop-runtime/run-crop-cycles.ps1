param([int]$Cycles = 10)
$ErrorActionPreference = 'Continue'
$env:ANDROID_SERIAL = 'emulator-5554'
$evidence = 'docs/development/evidence/20261028-crop-runtime'
$log = Join-Path $evidence 'crop-cycles-result.txt'

function Dump([string]$name) {
  adb shell uiautomator dump /sdcard/ui.xml 2>$null | Out-Null
  $dest = Join-Path $evidence $name
  adb pull /sdcard/ui.xml $dest 2>$null | Out-Null
  return (Get-Content $dest -Raw -ErrorAction SilentlyContinue)
}

function TapBounds([string]$xml, [string]$pattern, [string]$label) {
  $m = [regex]::Match($xml, $pattern)
  if (-not $m.Success) { return $false }
  $cx = [int]((+[int]$m.Groups[1].Value + [int]$m.Groups[3].Value) / 2)
  $cy = [int]((+[int]$m.Groups[2].Value + [int]$m.Groups[4].Value) / 2)
  adb shell input tap $cx $cy | Out-Null
  "tapped $label @ $cx,$cy" | Tee-Object -FilePath $log -Append
  return $true
}

function HasText([string]$xml, [string]$t) { return $xml -match [regex]::Escape($t) }

function CrashCount() {
  $c = adb logcat -d | Select-String -Pattern 'disconnectAnimatedNodeFromView|JSApplicationIllegalArgumentException: disconnectAnimated'
  return @($c).Count
}

function WaitFor([scriptblock]$pred, [int]$seconds = 20, [string]$name = 'cond') {
  for ($i = 0; $i -lt $seconds; $i++) {
    $xml = Dump ("wait-$name-$i.xml")
    if (& $pred $xml) { return $xml }
    Start-Sleep 1
  }
  return (Dump "wait-$name-timeout.xml")
}

adb logcat -c | Out-Null
"START $(Get-Date -Format o)" | Set-Content $log

# Bring app forward
adb shell am start -n com.eduvijna.app/.MainActivity | Out-Null
Start-Sleep 3

$xml = Dump 'nav-start.xml'

# If already on camera preview with Crop, skip setup
$onPreview = (HasText $xml 'Camera Document') -and (HasText $xml 'Crop')
if (-not $onPreview) {
  # Back out of PDF/library preview if needed
  if ((HasText $xml 'Linear Polynomials') -or ((HasText $xml 'Page 1 of') -and -not (HasText $xml 'Camera Document'))) {
    "leaving_library_preview" | Tee-Object -FilePath $log -Append
    adb shell input keyevent 4 | Out-Null
    Start-Sleep 2
    $xml = Dump 'nav-after-back.xml'
  }

  # Navigate to Document assessment from dashboard
  if (HasText $xml 'Generate Assessment' -or HasText $xml 'Hello') {
    # Tap Document card — prefer text node, then nearby content-desc
    if (-not (TapBounds $xml 'text="Document"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"' 'Document')) {
      # Scroll down and retry
      adb shell input swipe 540 1400 540 600 300 | Out-Null
      Start-Sleep 1
      $xml = Dump 'nav-scrolled.xml'
      TapBounds $xml 'text="Document"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"' 'Document' | Out-Null
    }
    Start-Sleep 3
    $xml = Dump 'nav-doc-home.xml'
  }

  # Camera capture
  if (-not (HasText $xml 'Camera Document')) {
    if (-not (TapBounds $xml 'text="Camera"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"' 'Camera')) {
      TapBounds $xml 'content-desc="[^"]*Camera[^"]*"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"' 'CameraDesc' | Out-Null
    }
    Start-Sleep 4
    # permission if any
    $xml = Dump 'nav-camera.xml'
    if (HasText $xml 'While using the app') {
      TapBounds $xml 'text="While using the app"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"' 'AllowCam' | Out-Null
      Start-Sleep 2
      $xml = Dump 'nav-camera2.xml'
    }
    # shutter — center bottom typical for expo-camera
    adb shell input tap 540 1700 | Out-Null
    "shutter_tapped" | Tee-Object -FilePath $log -Append
    $xml = WaitFor { param($x) (HasText $x 'Camera Document') -and (HasText $x 'Crop') } 25 'preview'
  }
}

if (-not ((HasText $xml 'Camera Document') -and (HasText $xml 'Crop'))) {
  "SETUP_FAIL no camera preview with Crop" | Tee-Object -FilePath $log -Append
  Get-Content $log
  exit 2
}

"setup_ok preview ready" | Tee-Object -FilePath $log -Append

$ok = 0
$fail = 0
for ($i = 1; $i -le $Cycles; $i++) {
  "CYCLE $i" | Tee-Object -FilePath $log -Append
  $before = CrashCount
  $xml = Dump "cycle-$i-preview.xml"

  if (-not (HasText $xml 'Crop')) {
    "no_crop_button" | Tee-Object -FilePath $log -Append
    $fail++
    continue
  }

  # Prefer resource-id / content-desc of the Crop action button
  $tapped = TapBounds $xml 'resource-id="document-preview-crop-page"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"' 'CropBtn'
  if (-not $tapped) {
    $tapped = TapBounds $xml 'content-desc="Crop selected page"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"' 'CropA11y'
  }
  if (-not $tapped) {
    $tapped = TapBounds $xml 'text="Crop"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"' 'CropText'
  }
  if (-not $tapped) {
    "no_crop_tap" | Tee-Object -FilePath $log -Append
    $fail++
    continue
  }

  $xml = WaitFor {
    param($x)
    (HasText $x 'Edit photo') -or ($x -match 'Crop &amp; use') -or (HasText $x 'Preparing') -or (HasText $x 'Working')
  } 15 "modal-$i"

  if (-not ((HasText $xml 'Edit photo') -or ($xml -match 'Crop &amp; use') -or (HasText $xml 'Preparing') -or (HasText $xml 'Working'))) {
    "modal_missing" | Tee-Object -FilePath $log -Append
    # dump texts for debug
    ([regex]::Matches($xml, 'text="([^"]{2,40})"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique | Select-Object -First 20) -join ' | ' |
      Tee-Object -FilePath $log -Append
    $fail++
    continue
  }

  # Wait until Crop & use enabled (UIAutomator encodes & as &amp;)
  $xml = WaitFor { param($x) ($x -match 'Crop &amp; use') -or ($x -match 'Apply crop and use photo') } 20 "ready-$i"
  if (-not (TapBounds $xml 'text="Crop &amp; use"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"' 'Confirm')) {
    if (-not (TapBounds $xml 'content-desc="Apply crop and use photo"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"' 'ConfirmA11y')) {
      "no_confirm" | Tee-Object -FilePath $log -Append
      $fail++
      continue
    }
  }

  $xml = WaitFor {
    param($x)
    (HasText $x 'Camera Document') -and (HasText $x 'Crop') -and -not (HasText $x 'Edit photo')
  } 20 "done-$i"

  $after = CrashCount
  $anr = (HasText $xml "isn't responding") -or (HasText $xml 'Close app')
  $err = (HasText $xml 'Something went wrong') -or (HasText $xml 'JSApplicationIllegal') -or (HasText $xml 'disconnectAnimated')
  $back = (HasText $xml 'Camera Document') -and (HasText $xml 'Crop')

  if (($after -gt $before) -or $anr -or $err -or -not $back) {
    "FAIL crashDelta=$($after-$before) anr=$anr back=$back" | Tee-Object -FilePath $log -Append
    $fail++
  } else {
    "PASS" | Tee-Object -FilePath $log -Append
    $ok++
  }
}

"SUMMARY ok=$ok fail=$fail crashes=$(CrashCount)" | Tee-Object -FilePath $log -Append
adb logcat -d | Select-String -Pattern 'disconnectAnimatedNodeFromView|JSApplicationIllegalArgumentException' |
  Out-File (Join-Path $evidence 'logcat-after-cycles.txt')
Get-Content $log
