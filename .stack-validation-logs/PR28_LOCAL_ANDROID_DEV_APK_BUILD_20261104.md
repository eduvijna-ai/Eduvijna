# PR #28 — Authorized Local Android FCM DEV APK Build (2026-11-04)

## Status fields

```text
MOBILE_SOURCE_SHA=0836ac5adefbcc65869ac57acd4cdf9b39deac8e
BUILD_WORKSPACE=D:\wt\eduvijna-push-apk-build-0836ac5
PREFLIGHT_PASS=true
FIREBASE_CONFIG_VERIFIED=true
DEV_PACKAGE_VERIFIED=true
DEV_API_VERIFIED=true
INDEPENDENT_DEPENDENCIES_VERIFIED=true
ANDROID_PREBUILD_PASS=true
GRADLE_BUILD_PASS=true
APK_CREATED=true
APK_ABSOLUTE_PATH=D:\wt\eduvijna-push-apk-build-0836ac5\android\app\build\outputs\apk\debug\app-debug.apk
APK_SIZE_BYTES=183992368
APK_SHA256=70D4D365080E43654AAF6C108406DFEED097844485A4D584CD206B9033CF794A
APK_INSTALLED=false
EAS_CLOUD_BUILD_STARTED=false
PRODUCTION_UNCHANGED=true
BACKEND_UNCHANGED=true
PR28_MERGED=false
PHYSICAL_FCM_DELIVERY_VERIFIED=false
REMAINING_BLOCKERS=Founder authorization required for APK install + physical FCM acceptance; backend DEV FCM readiness still external
```

## Phase summary

### Phase 1 — Preflight
- PR #28 DRAFT HEAD = `0836ac5` (exact match).
- Feature worktree `D:\wt\eduvijna-mobile-push-p0` preserved (evidence untracked retained).
- `google-services-dev.json` present, gitignored; project `eduvijna-push` / `416066207556` / includes `com.eduvijna.app.dev`.
- DEV Expo config → `https://dev-api.eduvijna.com`; production remains `com.eduvijna.app`.
- JDK 17, Android SDK platforms 35/36, build-tools 36.x available.
- Feature `node_modules` is a junction → isolated build workspace required (used).

### Phase 2 — Isolated build workspace
- Created detached worktree at `D:\wt\eduvijna-push-apk-build-0836ac5` @ `0836ac5`.
- `npm ci` → real directory `node_modules` (not a junction/symlink); Expo CLI present.
- Copied approved `google-services-dev.json` from feature worktree; source preserved; destination gitignored.

### Phase 3 — Resolved DEV config
```text
ANDROID_PACKAGE=com.eduvijna.app.dev
APP_NAME=EduVijna Dev
API=https://dev-api.eduvijna.com
FIREBASE_PROJECT=eduvijna-push
GOOGLE_SERVICES_FILE=./google-services-dev.json
DEEP_LINK_SCHEME=eduvijna-dev
PRODUCTION_APP_LINK_INTERCEPTION=false
DEV_OTA_ENABLED=false
```
`npm run config:verify` EXIT 0 in build workspace.

### Phase 4 — Build
```text
npx --no-install expo prebuild --platform android --no-install
→ PREBUILD_EXIT=0
applicationId/namespace = com.eduvijna.app.dev

cd android
.\gradlew.bat :app:assembleDebug --no-daemon
→ BUILD SUCCESSFUL in 23m 12s; GRADLE_EXIT=0
```

### Phase 5 — APK verification
| Field | Value |
|---|---|
| Path | `D:\wt\eduvijna-push-apk-build-0836ac5\android\app\build\outputs\apk\debug\app-debug.apk` |
| Size | 183992368 bytes (~175.5 MiB) |
| SHA-256 | `70D4D365080E43654AAF6C108406DFEED097844485A4D584CD206B9033CF794A` |
| aapt package | `com.eduvijna.app.dev` |
| aapt label | `EduVijna Dev` |
| compile/target SDK | 36 |
| Build type | debug (`assembleDebug`) |
| Signing | debug/default (not production keystore) |
| Embedded google-services | project `eduvijna-push` with `com.eduvijna.app.dev` client |

Cannot overwrite Play Store `com.eduvijna.app` (different applicationId).

APK not installed, not uploaded.

### Phase 6 — Regression (build workspace)

These results are from the isolated build workspace after APK compilation (distinct from prior feature-worktree runs).

```text
npx jest --forceExit --runInBand --testPathPattern "PushNotification|pushNotification|appPushNotification|pendingNotification|notificationNavigation|gradedNotification|notificationReadState|notifications.api.readState"
→ Test Suites: 8 passed, 8 total
→ Tests:       38 passed, 38 total

npm run test:journey-logic
→ # pass 28 / # fail 0
```

Native `android/` generated only in isolated build worktree; not committed. Firebase JSON not committed. Feature PR remains DRAFT; `main` / PlayRelease unchanged.

## Explicit non-actions
- APK not installed (`adb install` / `expo run:android` not used)
- No EAS cloud build
- No external upload
- No production signing / production variant
- No backend or Firebase credential changes
- PR #28 not merged
