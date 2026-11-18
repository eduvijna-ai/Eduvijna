# PR #28 — Complete Android FCM Validation Handoff (2026-11-02)

Worktree: `d:\wt\eduvijna-mobile-push-p0`  
Branch: `fix/push-fcm-delivery-p0`  
DRAFT PR: https://github.com/eduvijna-ai/Eduvijna/pull/28  

Expected sync target was `cb1e549`. Remote advanced during validation; worktree FF’d through `cb1e549` → `f806a49`, then this pass added `8f5d039`.

No APK build/upload, no EAS cloud build, no backend deploy, production untouched. PR remains DRAFT.

## Status fields

```text
MOBILE_PR_HEAD_SHA=8f5d0399f533f1ff14b015c03c91d21edfa196b5
ANDROID_CHANNEL_TEST_PASS=true
FCM_UNIT_TESTS_PASS=true
NOTIFICATION_NAVIGATION_TESTS_PASS=true
ANDROID_CONFIG_VERIFIED=true
PR_INTRODUCED_REGRESSIONS=0 (fixed dead Profile Expo copy-token diagnostics + misleading TestNotifications delivery claim)
ANDROID_DEV_BUILD_READY=false
APK_TEST_PACKAGE_STRATEGY=side_by_side_com.eduvijna.app.dev_recommended
PHYSICAL_DEVICE_PREREQUISITES=see below
BACKEND_DEPENDENCIES=see below
READY_FOR_PHYSICAL_ACCEPTANCE=false
```

## Task 1 — Safe sync

| Check | Result |
|---|---|
| Main checkout `D:\Eduvijna-Android-App\Eduvijna` | Preserved on `main` |
| PlayRelease | Preserved (detached `b42bcd1`; not altered this pass) |
| Feature worktree | FF-only `61a48dd` → `cb1e549` → (already at) `f806a49`; then commit `8f5d039` |
| Local evidence / WIP | Preserved (untracked stack logs / docs untouched by sync) |

## Task 2 — Android implementation checklist

| Requirement | Evidence |
|---|---|
| Native FCM only (`getDevicePushTokenAsync`) | `PushNotificationService.getToken` — no Expo fallback |
| Reject `ExponentPushToken` + `ExpoPushToken` | `isExpoPushToken` + registration guards + unit tests |
| Await Android channel before permission/token | `ensureAndroidNotificationChannel()` awaited in `requestPermission` / `getToken`; Jest covers race |
| One global notification handler | Sole production `setNotificationHandler` in `PushNotificationService.ts` (SDK 54 `shouldShowBanner` / `shouldShowList`) |
| Token refresh | `subscribeToTokenRefresh` + `handleTokenRefresh` (listener token preferred) |
| Login / logout / account switch | `syncStatusAfterLogin`, `initializeOnAppLaunch`, `detachAccountAssociation` via `useAuth` |
| Background + cold-start taps | `addNotificationResponseReceivedListener` + `getLastNotificationResponseAsync` in `App.tsx` |
| No duplicate registration authority | Profile toggle + BottomTab prompt + diagnostics call shared `enablePushNotifications` |
| Safe diagnostics / logging | Service uses `safePushError` / redacted token logs; Profile dead Expo copy UI removed (`8f5d039`); TestNotifications no longer shows raw tokens |

### Commands and counts

```text
npx jest --forceExit --runInBand --testPathPattern "PushNotification|pushNotification|appPushNotification|pendingNotification|notificationNavigation|gradedNotification|notificationReadState|notifications.api.readState"
→ Test Suites: 8 passed, 8 total
→ Tests:       38 passed, 38 total

npm run test:journey-logic
→ # pass 28 / # fail 0

npm run config:verify
→ all OK (dev-api default; production → eduapi; invalid/conflicting env rejected)
```

Channel-specific assertion: `awaits Android notification channel before permission and native FCM token operations` — PASS (included in the 38).

### TypeScript vs main baseline

- Repo-wide `tsc --noEmit`: **212** error lines (baseline noise; not gated clean).
- Mobile Profile push diagnostics unused/`handleCopyPushToken` TS6133 **removed** by `8f5d039`.
- Remaining hits under `Profile.tsx` / `device.api` / `appPushNotificationResponse` are largely pre-existing typing debt (web Profile, stub fetchNotifications, etc.). No new push-service TypeScript failures observed after cleanup.

### Fix in this pass

Commit `8f5d039` — remove dead Profile Expo/FCM copy-token handler + clarify TestNotifications backend-registration alert (no physical-delivery claim).

## Task 3 — Development-build readiness

### EAS profiles (`eas.json`)

| Profile | API env | Notes |
|---|---|---|
| `development` | `EDUVIJNA_API_ENV=development` → DEV API | `developmentClient: true` — **required** for native FCM (not Expo Go) |
| `preview` | `production` | **Do not use for DEV FCM testing** |
| `production` | `production` | Untouched |

### Package ID conflict

Current Android applicationId / `google-services.json` client: **`com.eduvijna.app`** (Firebase project `eduvijna-push` / `416066207556`).

Installing a DEV client or APK with the **same** package id as the Founder Play Store app **will conflict** (cannot install side-by-side; sideload would replace/refuse depending on signing). **Do not uninstall or overwrite** the Founder Play app.

### Recommended strategy: `com.eduvijna.app.dev`

Use a **separate** Android application id for physical DEV FCM acceptance:

1. Firebase Console (authorized ops only): register Android app `com.eduvijna.app.dev` under project **`eduvijna-push`**.
2. Download a matching `google-services.json` that includes the new client (or merge clients) — **do not invent credentials**; ops/Founder supplies the file.
3. Point the DEV build `android.package` / EAS profile at `com.eduvijna.app.dev` and the matching google-services file.
4. Build with EAS profile **`development`** only (DEV API + development client). No `preview`/`production` for this test.
5. Install **alongside** Play Store `com.eduvijna.app` without removing it.

`ANDROID_DEV_BUILD_READY=false` until Founder approves the package strategy + Firebase app registration + an EAS build.

**Do not build or upload an APK without separate Founder approval.**

## Task 4 — Test environment

- Focused Jest / journey / config:verify ran in feature worktree with its existing dependency resolution.
- No shared `node_modules` junction Metro export this pass.
- PlayRelease not altered; no temporary checkout/bundle re-run.

## PHYSICAL_DEVICE_PREREQUISITES

1. Founder-approved DEV Android development-client build (`development` EAS profile).
2. Side-by-side package strategy (`com.eduvijna.app.dev` + matching Firebase android app / google-services) **or** explicit Founder decision to use a dedicated test device without Play app.
3. Physical Android device with Google Play services (e.g. OPPO target from prior plan).
4. Test accounts on DEV API only.
5. Backend DEV Firebase Admin initialized with `project_id=eduvijna-push` and PR #409 contract live (see below).

## BACKEND_DEPENDENCIES

| Dependency | Status |
|---|---|
| Backend DRAFT PR #409 on DEV | **Not deployed** — live health still stub `provider_status=connected` |
| Firebase Admin init on DEV | **Unverified** (ops) |
| Service-account project == `eduvijna-push` | **Unverified** (ops) |
| Honest `push_accepted_count` / failure counters | **Code on #409; not live** |
| Dual Expo token reject on register | Backend must reject both prefixes (mobile already does) |

Physical acceptance of FCM delivery is **blocked** until DEV backend readiness + Founder-approved mobile DEV client install.

## READY_FOR_PHYSICAL_ACCEPTANCE

**false** — automated Android FCM mobile gates for this PR are green, but physical acceptance still requires:

1. Founder-approved DEV package/build path (no Play overwrite),
2. Backend DEV Firebase + #409 contract,
3. Device install + G1–G10 physical suite.

Keep PR #28 DRAFT. No merge.
