# PR #28 — Standalone Android DEV QA APK Build (2026-11-04)

## Status fields

```text
MOBILE_SOURCE_SHA=0836ac5adefbcc65869ac57acd4cdf9b39deac8e
BUILD_WORKSPACE=D:\wt\eduvijna-push-standalone-qa-0836ac5

PREFLIGHT_PASS=true
STANDALONE_APK_BUILD_PASS=true
GRADLE_RELEASE_BUILD_PASS=true
JAVASCRIPT_BUNDLE_EMBEDDED=true

EXPO_DEV_LAUNCHER_EXPECTED=false
METRO_REQUIRED=false
PHYSICAL_LAUNCH_VERIFIED=false

ANDROID_PACKAGE=com.eduvijna.app.dev
APP_NAME=EduVijna Dev
API_ENVIRONMENT=development
FIREBASE_PROJECT=eduvijna-push

APK_CREATED=true
APK_ABSOLUTE_PATH=D:\wt\eduvijna-push-standalone-qa-0836ac5\android\app\build\outputs\apk\release\app-release.apk
APK_SIZE_BYTES=113398796
APK_SHA256=AB178EC2E314413436BDA39C3422C02A924B058146D3D1490BD47DF3732477F0
APK_SIGNING_CLASSIFICATION=release_variant_signed_with_android_debug_keystore_v2

FCM_UNIT_TESTS_PASS=true
NOTIFICATION_NAVIGATION_TESTS_PASS=true
JOURNEY_LOGIC_PASS=true
PR_INTRODUCED_REGRESSIONS=0

APK_INSTALLED=false
EAS_CLOUD_BUILD_STARTED=false
PRODUCTION_UNCHANGED=true
BACKEND_UNCHANGED=true
PR28_MERGED=false

READY_FOR_FOUNDER_INSTALLATION_REVIEW=true
PHYSICAL_FCM_DELIVERY_VERIFIED=false
REMAINING_BLOCKERS=Founder-authorized device install + on-device launch confirmation; backend DEV FCM provider readiness for physical push delivery
```

## Preflight

- Remote PR #28 DRAFT HEAD == expected `0836ac5`.
- Feature worktree `D:\wt\eduvijna-mobile-push-p0` preserved.
- Prior debug APK preserved at `D:\wt\eduvijna-push-apk-build-0836ac5\...\app-debug.apk`.
- main / PlayRelease unchanged.
- `google-services-dev.json` copied into build workspace; gitignored; project `eduvijna-push` / `416066207556` / includes `com.eduvijna.app.dev`.
- Independent `npm ci` (real `node_modules` directory, not a junction).

## Configuration (resolved)

```text
ANDROID_PACKAGE=com.eduvijna.app.dev
APP_NAME=EduVijna Dev
API_BASE_URL=https://dev-api.eduvijna.com
GOOGLE_SERVICES_FILE=./google-services-dev.json
DEEPLINK_SCHEME=eduvijna-dev
EXPO_UPDATES_ENABLED=false
PRODUCTION_APP_LINKS=false
```

`npm run config:verify` → EXIT 0 (approved DEV variant path).

Embedded `app.config` (release assets) contains DEV API + `com.eduvijna.app.dev` and not production eduapi.

## Build procedure executed

```text
EDUVIJNA_API_ENV=development
EDUVIJNA_APP_VARIANT=development
npx --no-install expo prebuild --platform android --no-install  → PASS
cd android
.\gradlew.bat :app:assembleRelease --no-daemon                 → BUILD SUCCESSFUL in 26m 48s
```

Did **not** use EAS `android-fcm-dev` (developmentClient=true). Did **not** use `assembleDebug`.

## Standalone / launcher evidence

| Check | Result |
|---|---|
| LAUNCHER activity | `.MainActivity` (MAIN/LAUNCHER) |
| MainActivity base | `ReactActivity` (not DevLauncherActivity) |
| Main component | `"main"` |
| JS bundle task | `:app:createBundleReleaseJsAndAssets` ran |
| Generated bundle | `...\createBundleReleaseJsAndAssets\index.android.bundle` (5,574,436 bytes) |
| Inside APK assets | `assets/index.android.bundle` present (~5.57 MB) |
| Metro required | **false** (release embeds bundle) |
| Expo Dev Home expected | **false** (normal MainActivity entry) |

## APK verification

| Field | Value |
|---|---|
| Path | `D:\wt\eduvijna-push-standalone-qa-0836ac5\android\app\build\outputs\apk\release\app-release.apk` |
| Size | 113,398,796 bytes |
| SHA-256 | `AB178EC2E314413436BDA39C3422C02A924B058146D3D1490BD47DF3732477F0` |
| aapt package | `com.eduvijna.app.dev` |
| aapt label | `EduVijna Dev` |
| variantName | `release` |
| apksigner | **Verifies** (APK Signature Scheme v2, 1 signer) |
| Signing | Release build type signed with existing Android **debug** keystore (QA-installable; not production keystore) |
| Firebase in `android/app` | `eduvijna-push` + `com.eduvijna.app.dev` client |
| Production package collision | None (separate `.dev` id) |

Not installed. Not uploaded. No EAS cloud build.

## Automated tests (standalone build workspace)

```text
Focused FCM + notification navigation Jest
→ Test Suites: 8 passed, 8 total
→ Tests:       38 passed, 38 total

npm run test:journey-logic
→ # pass 28 / # fail 0

npm run config:verify
→ all OK
```

## Source changes / commits

No feature-branch source commits this pass. Native `android/` and gitignored Firebase JSON remain local to the isolated build workspace only. PR #28 stays DRAFT.

## Remaining blockers for physical acceptance

1. Separate Founder authorization to **install** this APK on a device.
2. On-device confirmation that cold start opens login (not Expo Dev Home) without Metro.
3. Backend DEV Firebase Admin / PR #409 readiness before claiming FCM delivery.
