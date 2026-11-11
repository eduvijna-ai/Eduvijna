# iOS FCM — TestFlight physical acceptance checklist

**Build profile:** `ios-fcm-testflight`  
**Bundle ID:** `com.eduvijna.app`  
**Apple Team:** `847JWGJ2VM`  
**API:** `https://eduapi.eduvijna.com`  
**Firebase:** `eduvijna-push`  
**APNs entitlement:** production  
**Distribution:** App Store / TestFlight  

Use only approved, narrowly scoped production test accounts. Do not blast real classrooms.

## Pre-flight (Founder)

- [ ] Apple Developer → Identifiers → `com.eduvijna.app` → **Push Notifications** enabled
- [ ] EAS production env file variable `EDUVIJNA_IOS_GOOGLE_SERVICES_FILE` present (secret)
- [ ] Authorized EAS iOS build from verified SHA (Draft PR #29 or merged main)
- [ ] Build uploaded to TestFlight; install on physical iPhone
- [ ] Record exact Git SHA on the build

## Device acceptance

- [ ] App launches
- [ ] Backend JWT login succeeds
- [ ] User grants notification permission (once; no re-prompt loops)
- [ ] Native **FCM** registration token obtained (not Expo token, not raw APNs hex)
- [ ] Backend `POST /api/notifications/devices` with `platform: ios` succeeds
- [ ] Firebase provider accepts send for that token
- [ ] Visible banner/alert on iPhone
- [ ] Foreground presentation works
- [ ] Background presentation works
- [ ] Cold start (terminated) notification tap opens correct screen
- [ ] Signed-out tap queues intent; after login navigates correctly
- [ ] Assessment assignment notification → student take flow / Assessments
- [ ] Graded/results notification → results routing
- [ ] Announcement / general notification → Notifications (or intended screen)
- [ ] Token refresh still registered after rotation
- [ ] Logout detaches account association; next login rebinds
- [ ] Account switch does not leave stale associations
- [ ] Duplicate tap / duplicate presentation does not double-navigate
- [ ] Android regression smoke remains clear (separate device)

## Stop conditions

- Do not merge to main until physical acceptance evidence is recorded
- Do not App Store release without separate Founder authorization
