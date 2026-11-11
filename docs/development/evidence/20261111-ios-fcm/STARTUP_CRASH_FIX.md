# iOS TestFlight startup crash — investigation & fix

## Observed failure

| Field | Value |
|---|---|
| App | EduVijna |
| Version / Build | 1.0.4 / 1.0.11 |
| EAS Build | `9688d54d-0130-4ad8-af1f-3488ef1f3b8f` |
| Source SHA | `7cf3274c98ddfe45d262cc38890f9d6821a637b0` |
| Error UI | `Something went wrong — undefined is not a function` |
| Timing | Immediate after TestFlight launch; login not reached |
| Physical iPhone | FAIL |

## Worktree state (pre-fix)

- Path: `D:\wt\eduvijna-mobile-ios-fcm`
- Branch: `feat/mobile-ios-fcm-notifications`
- HEAD: `7cf3274c98ddfe45d262cc38890f9d6821a637b0`
- `@react-native-firebase/app`: 27.1.1
- `@react-native-firebase/messaging`: 27.1.1
- Expo: ~54.0.35
- iOS runtimeVersion: `1.0.4-ios-fcm` (isolated from Android `1.0.0`)
- API base (app.json): `https://eduapi.eduvijna.com`

## Root cause

`@react-native-firebase/messaging@27.1.1` exports **only modular APIs** (`getMessaging`, `onTokenRefresh(messaging, listener)`, …). There is **no default `messaging()` export**.

Broken loader in `src/core/services/nativePushToken.ts` (`loadFirebaseMessaging`):

1. `require('@react-native-firebase/messaging')` → module namespace (no `default`)
2. Treated the namespace as a Messaging instance
3. `messaging.onTokenRefresh(listener)` bound the **modular** helper with **one** argument
4. Modular helper body: `return messaging.onTokenRefresh(listener)` where `messaging` was actually the listener function
5. `listener.onTokenRefresh` is `undefined` → Hermes: **`undefined is not a function`**

Call chain:

`App.tsx` (mobile boot `useEffect`) → `PushNotificationService.subscribeToTokenRefresh()` → `subscribeNativeFcmTokenRefresh()` → broken `onTokenRefresh` call

This runs before authentication. Device JS stack was unavailable (Windows host; no macOS Console). Root cause confirmed via:

- Installed RNFB 27 source (`dist/module/index.js`: no default export; modular `onTokenRefresh(messaging, listener)`)
- Controlled unit reproduction matching the Hermes message
- Prior Jest mocks hid the bug by faking `default: () => mockInstance`

## OTA exclusion (read-only)

- Build runtime: `1.0.4-ios-fcm` (new; not shared with Android `1.0.0`)
- `eas update:list --branch production` → branch not found (no production OTA branch)
- `ios-fcm-testflight` profile does not set an updates channel
- First-install crash is explained by embedded JS at `7cf3274` alone

## Fix

- Use modular `getMessaging()` + modular helpers (with instance-method fallback)
- Defensive try/catch around iOS token-refresh subscription and App boot wiring
- Jest mock updated to RNFB v27 modular shape (no fake default)
- Regression suite `nativePushToken.rnfbModular.test.ts` proves legacy loader throws and fixed loader registers correctly

## Validation

| Check | Result |
|---|---|
| Targeted Jest (push/FCM) | 52 passed |
| `config:verify` | PASS |
| `test:ios-fcm-config` | 8/8 pass |
| `test:journey-logic` | 28/28 pass |
| iOS production `expo export` | PASS → `.expo-export-check/ios-prod-startup-fix` |
| Full `tsc --noEmit` | Pre-existing repo errors unrelated to this fix; no errors in changed push/boot files |
| Physical iPhone retest | PENDING (requires new IPA) |
| New EAS build / TestFlight upload | NOT started (await Founder authorization) |

## Recommended next build (not started)

- Marketing version: keep `1.0.4`
- Build number: `1.0.12` (after `1.0.11`), subject to ASC / EAS autoIncrement verification
