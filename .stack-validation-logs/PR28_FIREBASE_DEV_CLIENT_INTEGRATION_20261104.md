# PR #28 — Firebase DEV Client Integration Handoff (2026-11-04)

Worktree: `D:\wt\eduvijna-mobile-push-p0`  
Branch: `fix/push-fcm-delivery-p0`  
DRAFT PR: https://github.com/eduvijna-ai/Eduvijna/pull/28  

No APK build, EAS cloud build, install, OTA, merge, or Firebase credential disclosure.  
Production `google-services.json` untouched. Original Founder file left in place.

## Status fields

```text
MOBILE_PR_HEAD_SHA=0836ac5adefbcc65869ac57acd4cdf9b39deac8e
FIREBASE_DEV_APP_REGISTERED=true
FIREBASE_DEV_JSON_VALID=true
FIREBASE_DEV_FILE_IN_WORKTREE=true
FIREBASE_JSON_GITIGNORED=true
ANDROID_DEV_CONFIG_PASS=true
PRODUCTION_CONFIG_UNCHANGED=true
FCM_TESTS_PASS=true
ANDROID_DEV_BUILD_READY=true
APK_BUILD_AUTHORIZATION_REQUIRED=true
REMAINING_BLOCKERS=see below
```

## Task 1 — Integrate Firebase client file

| Check | Result |
|---|---|
| Source path | `D:\Eduvijna-Android-App\Eduvijna\google-services-dev.json` (exists; not moved/deleted) |
| Destination | `D:\wt\eduvijna-mobile-push-p0\google-services-dev.json` (copied; no prior conflict) |
| Project ID | `eduvijna-push` |
| Project number | `416066207556` |
| Packages present (names only) | `com.eduvijna.app`, `com.eduvijna.app.dev` |
| Git sync | FF-only to expected HEAD `0836ac5` |
| Gitignore | `.gitignore` lines `google-services.dev.json` + `google-services-dev.json` |
| `git check-ignore` | matches `.gitignore:30:google-services-dev.json` |
| `git status --ignored` | `!! google-services-dev.json` (not staged/tracked) |

No secrets printed. No new mobile commits this pass (integration is local gitignored file only).

## Task 2 — Configuration verification

```text
npm run config:verify
→ EXIT 0
```

Confirmed OK lines include:

- Dedicated `android-fcm-dev` → side-by-side APK + DEV API + `EDUVIJNA_APP_VARIANT=development`
- Existing `development` / `preview` / `production` identities unchanged
- Expo production retains `com.eduvijna.app` / scheme `eduvijna`
- **Approved Android DEV variant** isolated identity, DEV API, no OTA
- DEV variant does not intercept production App Links

Resolved DEV Expo config (non-secret fields):

- name `EduVijna Dev`
- package `com.eduvijna.app.dev`
- googleServicesFile `./google-services-dev.json`
- API `https://dev-api.eduvijna.com`
- scheme `eduvijna-dev`
- updates.enabled `false`
- intentFilters: `eduvijna-dev` only (no `app.eduvijna.com`)

## Task 3 — Automated validation

```text
npx jest --forceExit --runInBand --testPathPattern "PushNotification|pushNotification|appPushNotification|pendingNotification|notificationNavigation|gradedNotification|notificationReadState|notifications.api.readState"
→ Test Suites: 8 passed, 8 total
→ Tests:       38 passed, 38 total

npm run test:journey-logic
→ # pass 28 / # fail 0
```

TypeScript: no new errors on `app.config` / `PushNotificationService` surface from this integration (repo-wide baseline noise unchanged; no PR-introduced defect found requiring a code fix).

## Task 4 — Android test-build readiness (no build executed)

| Item | Status |
|---|---|
| Feature SHA | `0836ac5` |
| EAS profile | `android-fcm-dev` (extends development, DEV API, variant development, APK) |
| Local worktree file present for config resolve | Yes |
| Cloud EAS upload of gitignored JSON | **Not automatic** — file is gitignored; no `.easignore` override; `eas.json` has no file secret / `EDUVIJNA_ANDROID_DEV_GOOGLE_SERVICES_FILE` wiring |
| Founder APK / EAS authorization | **Required before any build** |

`ANDROID_DEV_BUILD_READY=true` means mobile config + approved DEV Firebase client are ready for a Founder-authorized build request.  
`APK_BUILD_AUTHORIZATION_REQUIRED=true` — do not run `eas build` / install without separate Founder approval.

For **EAS cloud** builds after authorization, Founder/ops must also approve one of:

1. Local/on-prem build from this worktree (file already on disk), or  
2. An approved EAS file secret / env that supplies `google-services-dev.json` (or `EDUVIJNA_ANDROID_DEV_GOOGLE_SERVICES_FILE`) into the build environment without committing the JSON.

## REMAINING_BLOCKERS

1. **Founder authorization** to generate the DEV APK via `android-fcm-dev` (not requested here).
2. **Cloud EAS file injection plan** if cloud (not local) build is chosen — gitignored JSON will not upload by default.
3. **Backend DEV FCM readiness** (PR #409 Admin init / project match / `push_accepted_count`) still external to mobile.
4. **Physical device install + G1–G10 acceptance** after APK exists.

## New mobile commits this pass

None. HEAD remains `0836ac5`. Local gitignored file only.
