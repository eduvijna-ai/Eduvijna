# Verification matrix — login / icon / school branding

**Branch:** `feat/mobile-login-icon-school-branding`  
**Commit:** `18a1ffc`  
**Draft PR:** https://github.com/eduvijna-ai/Eduvijna/pull/32  
**Worktree:** `D:\wt\eduvijna-mobile-login-icon-branding`

## Builds

| Platform | Profile | Result | Link / artifact |
|---|---|---|---|
| Android | `preview` (EAS) | **FAIL** then **retry queued** | First: https://expo.dev/accounts/samathakotikanyadanam/projects/eduvijna/builds/4ddc4dbb-76b6-4367-9c9b-e32077e20c43 — Retry: https://expo.dev/accounts/samathakotikanyadanam/projects/eduvijna/builds/369a468d-3664-45aa-a965-9b413308a5f1 |
| Android | local `expo run:android` | **FAIL** (`@react-native-firebase/app` Kotlin nullability on this workstation) | See local build log (not committed) |
| iOS | `ios-fcm-testflight` (EAS) | **PASS** (build finished) | https://expo.dev/accounts/samathakotikanyadanam/projects/eduvijna/builds/3e2a90b1-c83c-43f6-b09f-0d2de3dcdf6a — IPA: https://expo.dev/artifacts/eas/vtTU7aKE--0fWbn81RpFgJVYwwml4YKftdZiWqlEuw0.ipa |

Installed-device launcher icon checks require the native artifact (icons are not OTA). iOS IPA is ready; Android native APK not yet produced from this SHA.

## Functional checks

| Check | Android | iOS | Notes |
|---|---|---|---|
| Redesigned login UI | **PASS** | **unverified** | Emulator + Metro (`android-login-redesign.png`). Pale-teal notebook header, stacked mark, labels, dark-teal Sign in, testIDs present. |
| Keyboard-open layout | **PASS** (visual) | **unverified** | `android-login-failed-retry.png` shows form prioritized above keyboard. |
| Failed-login shows error + stays on form | **PASS** | **unverified** | `android-login-failed-retry.png` + `ui-fail3.xml` show **Invalid credentials** with fields still editable. Success login blocked: no `.dev-api-credentials.local.json`. |
| Launcher icon (stacked on white) | **unverified** (no APK) | **unverified** (IPA not installed here) | Generator previews: `android-launcher-preview-circle.png` / `square.png` (`insideSafe=true`). |
| School logo in header | **unit PASS** / E2E **unverified** | **unverified** | Unit coverage in `schoolBranding.test.ts` (same-URL revision + account isolation). Live upload/replace/remove needs disposable school + credentials. |
| Account isolation | **unit PASS** | n/a | Stale response / logout clear covered in unit tests. |

## Unit tests

```text
npx jest src/__tests__/schoolBranding.test.ts src/__tests__/useAuth.lifecycle.test.ts src/__tests__/authLifecycle.policy.test.ts --forceExit --runInBand
→ 22 passed
```

## Blockers requiring Founder (only remaining)

1. Place authorized `.dev-api-credentials.local.json` (or set `DEV_API_CREDENTIALS_FILE`) in the worktree so engineering can finish login success + school logo upload/replace/remove on a disposable school.
2. Install iOS IPA from the build link above on an internal device and return Home Screen launcher screenshot + login screenshot.
3. After Android EAS Gradle failure is fixed/rerun, install the preview APK and return Home Screen launcher screenshot.

Until (1)–(3), school branding E2E and installed launcher verification remain incomplete. Implementation + unit isolation coverage are on the draft PR.
