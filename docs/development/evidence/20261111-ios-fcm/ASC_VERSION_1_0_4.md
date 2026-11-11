# ASC marketing version advance — 1.0.4

Date: 2026-11-11

## Rejection evidence (confirmed)

| Field | Value |
|-------|-------|
| Rejected EAS Build ID | `c248a2cc-798c-4aa7-b17c-ba4e4229e1aa` |
| Rejected marketing version | `1.0.3` |
| Rejected build number | `1.0.10` |
| Apple 90062 | `CFBundleShortVersionString [1.0.3]` must be higher than previously approved `[1.0.3]` |
| Apple 90186 | Pre-release train `1.0.3` is closed for new build submissions |

This is a marketing-version / train rejection only. Firebase, APNs, Xcode, and EAS auth remain unchanged.

## Eligibility decision

- Latest approved App Store marketing version (per Apple 90062): **1.0.3**
- Train **1.0.3** is closed (per Apple 90186) — do not reopen or reuse that IPA
- Proposed next version **1.0.4** is higher than the approved version
- No repository evidence that **1.0.4** is already approved or closed
- **ASC_NEW_VERSION_ELIGIBILITY = 1.0.4 eligible** (Founder must still create/open the 1.0.4 train in ASC if required; this change does not create ASC version records)

## Source fix (this commit)

| Setting | Before | After |
|---------|--------|-------|
| `expo.ios.version` | `1.0.3` | `1.0.4` |
| `expo.ios.runtimeVersion` | `1.0.3-ios-fcm` | `1.0.4-ios-fcm` |
| `expo.version` (root / Android) | `1.0.0` | unchanged |
| `expo.runtimeVersion` (Android OTA) | `1.0.0` | unchanged |
| iOS build number | EAS remote `autoIncrement` | unchanged (not set locally) |

## Runtime compatibility decision

Prefer `1.0.4-ios-fcm` for the new store binary:

1. OTA policy already isolates iOS FCM binaries from Android `1.0.0` and from pre-RNFB iOS clients via an explicit iOS `runtimeVersion`.
2. Advancing the iOS runtime string with the marketing train prevents accidental OTA targeting between the closed `1.0.3` train metadata and the new `1.0.4` binary.
3. The rejected `1.0.3` / build `1.0.10` IPA must not be reused; a new EAS build (authorized separately) is required.
4. Android `runtimeVersion` remains `1.0.0` so production Android OTA compatibility is preserved.

## Not authorized in this pass

- New EAS build
- TestFlight / ASC submit
- Merge to main
- App Store release
