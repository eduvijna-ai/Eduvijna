# iOS FCM plist + config closure evidence

Date: 2026-11-11

## Git authority
- origin/main: `475158fd4005019cc6b2e0f67e42b54c340c2bb4`
- Prior feature HEAD: `3736c47c97038eaafcc45cd06378e49c2af8e5fe`
- Worktree: `D:\wt\eduvijna-mobile-ios-fcm`
- Draft PR: #29

## GoogleService-Info.plist
- Source: Founder-downloaded official Firebase iOS client file already present in feature worktree (replaced placeholder).
- Metadata validated (values not fully printed):
  - PROJECT_ID=eduvijna-push
  - GCM_SENDER_ID=416066207556
  - BUNDLE_ID=com.eduvijna.app
  - GOOGLE_APP_ID prefix=1:416066207556:ios:
  - isPlaceholder=false
- Preserved local copies (gitignored):
  - `./GoogleService-Info.plist`
  - `.local/GoogleService-Info.plist`
  - `.local/GoogleService-Info.plist.founder-download`
- Tracked placeholder removed from Git (`git rm --cached`)
- Sanitized tracked template: `GoogleService-Info.example.plist`
- `.gitignore` updated for `GoogleService-Info.plist` and `.local/`

## Framework linkage review
- Installed: `@react-native-firebase/app@27.1.1`, `@react-native-firebase/messaging@27.1.1`, Expo SDK 54
- Authoritative package README requires SPM + `use_frameworks! :linkage => :dynamic`
- Older Expo blogs recommending static frameworks are superseded for RNFB v27
- PR retains `useFrameworks: "dynamic"` — confirmed correct for these versions
- JS tests are not treated as CocoaPods compile proof

## Recommended iPhone acceptance build
- Profile: `ios-fcm-testflight` (store distribution, production API, production APNs entitlement)
- Alternate internal: `ios-fcm-preview`
- EAS file injection: Founder must create `EDUVIJNA_IOS_GOOGLE_SERVICES_FILE` (file) — see `IOS_FCM_EAS_FILE_INJECTION.md`
- No EAS build started in this pass

## Apple Push capability
- APNs keys: screenshot_confirmed (dev+prod in Firebase)
- App ID Push capability / provisioning: UNVERIFIED (Founder Apple Developer UI check required)
