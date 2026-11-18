# PR #28 — Android FCM DEV Variant Verification (2026-11-03)

Worktree: `d:\wt\eduvijna-mobile-push-p0`  
Branch: `fix/push-fcm-delivery-p0`  
DRAFT PR: https://github.com/eduvijna-ai/Eduvijna/pull/28  

No APK / EAS cloud build / upload / OTA / merge / deploy. No Firebase files created. PlayRelease untouched.

## Status fields

```text
MOBILE_PR_HEAD_SHA=bce13882834854ed955fb5e7b32cefe9d3824ad6
ANDROID_DEV_VARIANT_CONFIG_PASS=true
PRODUCTION_CONFIG_UNCHANGED=true
DEV_FIREBASE_CLIENT_CONFIG_AVAILABLE=false
FCM_UNIT_TESTS_PASS=true
JOURNEY_LOGIC_PASS=true
PR_INTRODUCED_REGRESSIONS=0 (verify fail-closed capture fixed this pass)
ANDROID_DEV_BUILD_READY=false
BACKEND_FCM_READY=false
READY_FOR_PHYSICAL_ACCEPTANCE=false
```

## Task 1 — Sync

- Remote expected HEAD `c992f152` confirmed on PR #28 (DRAFT).
- Feature worktree FF-only `8f5d039` → `c992f152`.
- Untracked evidence / other worktrees / main / PlayRelease preserved.

Commits reviewed at sync tip:

- `32e3b02` feat(android): prepare isolated DEV app variant for FCM physical acceptance
- `c992f15` fix(android): isolate side-by-side FCM APK in dedicated EAS profile

## Task 2–6 — Config / EAS / Firebase fail-closed

### Commands

```text
npm run config:verify
→ EXIT 0 after verify-script fix (initially failed one assertion due to empty --json pipes)
```

### Results (post-fix)

| Assertion | Result |
|---|---|
| Dedicated `android-fcm-dev` extends `development`, sets `EDUVIJNA_APP_VARIANT=development`, DEV API, APK | OK |
| `development` / `preview` / `production` unchanged (no `EDUVIJNA_APP_VARIANT`) | OK |
| Production Expo identity `com.eduvijna.app` / scheme `eduvijna` | OK |
| Legacy Metro (variant unset) retains `com.eduvijna.app` | OK |
| Missing `google-services.dev.json` → fail closed with actionable message | OK |
| DEV variant cannot use production API | OK |

### Production default (variant unset / production env)

Observed via `expo config --json`:

- package `com.eduvijna.app`
- `googleServicesFile` `./google-services.json` (present)
- App Links intentFilters include `https://app.eduvijna.com/openquiz` + scheme `eduvijna`
- updates enabled (production OTA path unchanged)
- iOS associatedDomains `applinks:app.eduvijna.com`

### Side-by-side DEV variant (`EDUVIJNA_APP_VARIANT=development`)

Designed in `app.config.ts` + `eas.json` profile `android-fcm-dev`:

- package `com.eduvijna.app.dev`
- name `EduVijna Dev`, scheme `eduvijna-dev`
- DEV API required (`EDUVIJNA_API_ENV=development`)
- `updates.enabled = false` (no production OTA)
- intentFilters only `eduvijna-dev` (does not include `app.eduvijna.com`)
- requires `./google-services.dev.json` (gitignored) or approved `EDUVIJNA_ANDROID_DEV_GOOGLE_SERVICES_FILE`

### Firebase client file

```text
google-services.json     PRESENT (production package)
google-services.dev.json ABSENT  → DEV_FIREBASE_CLIENT_CONFIG_AVAILABLE=false
```

Fail-closed error (human-readable expo config):

> Missing approved Firebase Android client configuration for com.eduvijna.app.dev. Provide google-services.dev.json ... Do not reuse the production google-services.json.

## Task 7–8 — Tests

```text
npx jest --forceExit --runInBand --testPathPattern "PushNotification|pushNotification|appPushNotification|pendingNotification|notificationNavigation|gradedNotification|notificationReadState|notifications.api.readState"
→ Test Suites: 8 passed, 8 total
→ Tests:       38 passed, 38 total

npm run test:journey-logic
→ # pass 28 / # fail 0
```

Baseline: no new push/journey failures. One PR-introduced defect in `config:verify` capture path fixed this pass.

## Task 9 — Remaining mobile implementation?

| Item | Needed? |
|---|---|
| Approved `google-services.dev.json` for `com.eduvijna.app.dev` | **Yes — ops/Founder supply only; do not invent** |
| EAS cloud / local APK via `android-fcm-dev` | Only after Firebase file + Founder build approval |
| Push notification runtime code changes | **No additional changes required for this variant gate** |
| Backend DEV FCM (#409 Admin init / project match / counters) | Still blocked off-mobile |

## ANDROID_DEV_BUILD_READY = false

Blocked until:

1. Real approved Firebase Android client config for `com.eduvijna.app.dev` is present in the authorized mobile project (or approved env path).
2. `npm run config:verify` takes the “approved DEV variant” branch (package/API/OTA/App Links assertions).
3. Separate Founder authorization to run EAS `android-fcm-dev` (not executed here).

`BACKEND_FCM_READY=false` and `READY_FOR_PHYSICAL_ACCEPTANCE=false` until backend DEV Firebase readiness and a Founder-approved DEV APK install path exist.
