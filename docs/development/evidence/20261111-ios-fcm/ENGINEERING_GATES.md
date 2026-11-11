# iOS FCM engineering evidence — 2026-11-11

MAIN_BASE_SHA=475158fd4005019cc6b2e0f67e42b54c340c2bb4
BRANCH=feat/mobile-ios-fcm-notifications
WORKTREE=D:\wt\eduvijna-mobile-ios-fcm
DRAFT_PR=29

## Validation
- npm run config:verify → exit 0 (includes Android-not-blocked-by-iOS-plist assertions)
- npm run test:ios-fcm-config → 4 passed
- jest PushNotificationService.fcmToken + iosFcm + nativePushToken + appPushNotificationResponse + pushNotificationAccountScope → 5 suites, 43 passed
- Android production `expo export` → succeeded (see .expo-export-check/android-prod-iosfcm)
- iOS JS export with placeholder plist → expected fail-closed until approved GoogleService-Info.plist
- PHYSICAL_IPHONE_TESTED=false
- IOS_FCM_DELIVERY_VERIFIED=false

## Firebase plugin
- Skills used: firebase-basics, ios_setup, Firebase MCP (mcp_auth transport OK; Google account login still required)
- MCP Google user: NONE — Founder must complete browser Firebase login (Session ID 7C3A4)
- APNs key status: not queryable via MCP/CLI; Founder Console verification required

## Config closure (post-83dbcfd)
- Fixed provision script to `apps:create IOS "EduVijna iOS" --bundle-id ...`
- Removed EDUVIJNA_REQUIRE_IOS_FIREBASE from Android production/preview EAS profiles
- aps-environment now profile-aware (development vs production)
- Confirmed RNFB v27 + Expo 54 requires `useFrameworks: dynamic` (SPM)
- Android FCM path unchanged; iOS uses messaging FCM token only
- Receipt/tap ownership remains expo-notifications on both platforms (no competing RNFB tap handlers)
