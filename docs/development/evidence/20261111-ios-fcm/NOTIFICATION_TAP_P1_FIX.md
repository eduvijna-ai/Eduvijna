# P1 notification tap navigation — engineering closure

Date: 2026-11-12  
Branch: `feat/mobile-ios-fcm-notifications` (Draft PR #29)  
TestFlight under acceptance: `1.0.5 (1.0.13)` / EAS `0cb1c05f-f9e0-41bc-a480-75437079e9f2`

## Founder failure

Tap shows: `Error — Notification data is incomplete. Please try again.`

## Backend contract (read-only)

Production `POST /api/notifications/send-test` sends:

```json
{ "test": "true", "self_test": "true" }
```

No `type`, `session_id`, or `quiz_id`. Assessment events remain flat string maps (`quiz_assigned` / `quiz_graded` / `quiz_completed`) with snake_case + camelCase duplicates.

## Root cause

Mobile `intentFromNotificationData()` returned `null` for self-test / empty routing payloads.  
`handleAppPushNotificationResponse()` then showed the incomplete-data alert.

## Fix

- Normalize flat / nested / JSON-string `data` envelopes.
- Map self-test / empty / announcement-like payloads to `general`.
- Authenticated + nav-ready → `Notifications`; otherwise queue pending intent.
- Assessment events missing required IDs → `Assessments` (or existing API lookup) with sanitized `[push-nav]` diagnostics.
- No incomplete-data alert for ordinary general/self-test taps.
- expo-notifications remains sole tap authority; RNFB Messaging token-only.

## Validation (this pass)

- Jest notification + FCM suites: **8 suites / 67 tests PASS** (+ nativePushToken **14 PASS**)
- `npm run config:verify`: PASS
- `npm run test:journey-logic`: **28 PASS**
- `npm run test:ios-fcm-config`: 17 PASS / **1 pre-existing FAIL** (`assertVersionBuildPairUnique` still expects `1.0.5/1.0.13` unused after history record at `11cd5ad`)
- iOS production `expo export`: PASS → `.expo-export-check/ios-prod-notif-tap-fix`
- TypeScript: no new errors in changed notification files vs HEAD baseline (pre-existing `appPushNotificationResponse.ts` typing debts unchanged)

## Not claimed

- Physical iPhone retest / Founder notification-tap acceptance PASS
- New EAS build / TestFlight upload
- Backend production change
