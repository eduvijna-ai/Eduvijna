# iOS FCM engineering evidence — 2026-11-11

MAIN_BASE_SHA=475158fd4005019cc6b2e0f67e42b54c340c2bb4
BRANCH=feat/mobile-ios-fcm-notifications
WORKTREE=D:\wt\eduvijna-mobile-ios-fcm

## Validation
- npm run config:verify → exit 0
- jest PushNotificationService.fcmToken + iosFcm + nativePushToken + appPushNotificationResponse + pushNotificationAccountScope → 5 suites, 43 passed
- npm run test:journey-logic → 28 passed
- tsc --noEmit → pre-existing errors only (none in push/nativePushToken/app.config paths)
- PHYSICAL_IPHONE_TESTED=false
- IOS_FCM_DELIVERY_VERIFIED=false

## Firebase plugin
- Skills used: firebase-basics, ios_setup reference, Firebase MCP tools (get_environment, login, list_apps, create_app, get_sdk_config intended)
- MCP authenticated user: NONE at implementation time — Founder must complete firebase_login (Session ID B805C) then re-run provision script
