# iOS FCM TestFlight readiness evidence

Date: 2026-11-11

## Authority
- origin/main: `475158fd4005019cc6b2e0f67e42b54c340c2bb4`
- Feature HEAD before this pass: `78d8f26a31f4e66f89be62ad86d19c76a610ec6b`
- Draft PR: #29
- Worktree: `D:\wt\eduvijna-mobile-ios-fcm`

## EAS production file variable
- Command: `eas env:list --environment production --format short`
- Result: `EDUVIJNA_IOS_GOOGLE_SERVICES_FILE` present as **secret** (contents not readable / not printed)
- `ios-fcm-testflight` now sets `"environment": "production"` so the secret is bound on the builder
- Local `app.config.ts` resolves `EDUVIJNA_IOS_GOOGLE_SERVICES_FILE || ./GoogleService-Info.plist`

## Apple Push capability
- APNs keys in Firebase: screenshot_confirmed (prior Founder pass)
- App ID Push Notifications capability: **UNVERIFIED** by agent (no Apple Developer API access)
- Founder UI: Identifiers → `com.eduvijna.app` → enable Push Notifications

## TestFlight profile resolved config (metadata)
- bundle: com.eduvijna.app
- appleTeamId: 847JWGJ2VM
- API: https://eduapi.eduvijna.com
- Firebase project: eduvijna-push
- aps-environment: production
- useFrameworks: dynamic (RNFB v27 SPM requirement)
- UIBackgroundModes: remote-notification
- plugins: expo-build-properties, @react-native-firebase/app, messaging, expo-notifications

## Native integration review
- iOS FCM token via messaging.getToken; Android unchanged getDevicePushTokenAsync
- Expo/APNs tokens rejected at registration boundary
- App.tsx: expo-notifications is sole receipt/tap authority; no RNFB onMessage/onNotificationOpenedApp/getInitialNotification
- Duplicate suppression via processed notification IDs in appPushNotificationResponse

## Validation
- config:verify OK
- ios-fcm-config: 7 passed
- journey-logic: 28 passed
- Jest push suites: 5 / 43 passed
- Android + iOS JS export: see `.expo-export-check/*-testflight-ready`

## Not claimed
- CocoaPods / EAS native compile
- Physical APNs delivery
- TestFlight upload
