# Crop runtime failure — evidence (2026-10-28)

## Root cause

`JSApplicationIllegalArgumentException: disconnectAnimatedNodeFromView: Animated node with tag […] does not exist`

Triggered on Fabric mount-item dispatch when `ImageCropModal` dismissed while Native Animated nodes (notably `ActivityIndicator` and Android `Modal` slide/fade teardown) were still connecting/disconnecting.

Before (redacted): `logcat-before-exception.txt` / `logcat-historical-before-fix.txt` — node tag **347**.

## Fix (smallest safe lifecycle)

- Remove `ActivityIndicator` from crop modal (static “Preparing…/Working…” labels).
- Android: `Modal` `animationType="none"`; hide via `visible && !dismissing` before resolving the crop session.
- `waitForSafeModalDismiss()` (InteractionManager + 2 rAF) before `resolveCropSession`.
- Single-flight: `flightRef` in modal + `resolving` lock in `imageCropSession`.
- Preview: `cameraAddOpIdRef` guards stale crop persistence after unmount/navigation.

## Emulator regression

- Device: `emulator-5554` / Metro `:8082`
- **10 consecutive Crop → Crop & use cycles: ok=10 fail=0 crashes=0**
- After logcat (`logcat-after-cycles.txt`): **no** `disconnectAnimatedNodeFromView`
- Result: `crop-cycles-result.txt`

## Automated

See `jest-crop-lifecycle.txt` and `jest-focused-full.txt` for suite/test counts.
