# EduVijna Mobile — P0 Firebase Push Diagnosis & Handoff (2026-11-02)

## Status flags

```text
PUSH_CODE_FIX_COMPLETE=true
FCM_PROVIDER_VERIFIED=false
PHYSICAL_DELIVERY_VERIFIED=false
NOTIFICATION_TAP_VERIFIED=false
REGRESSION_GATES_PASS=partial
READY_FOR_FOUNDER_ACCEPTANCE=false
```

`REGRESSION_GATES_PASS=partial`: mobile FCM unit suite + related push tap/account tests pass; backend FCM hardening pytest 25/25 pass; full mobile regression suite and physical gates not run. No PR merged; no deploy.

---

## 1. Verified baselines

| Repo | Remote | `origin/main` SHA | Feature branch / worktree |
|---|---|---|---|
| Mobile `eduvijna/Eduvijna` | `https://github.com/eduvijna/Eduvijna` | `b42bcd1acdbb2202792335c695c6da9da9e180f6` | `fix/push-fcm-delivery-p0` @ `d:\wt\eduvijna-mobile-push-p0` |
| Backend `eduvijna-ai/eduvijna-api` | `https://github.com/eduvijna-ai/eduvijna-api` | `2de33f07dc13149b76f7d51b4bf1a7ef10044ff2` | `fix/push-fcm-delivery-semantics-p0` @ `d:\wt\eduvijna-api-push-p0` |

Local checkout `D:\Eduvijna-Android-App\Eduvijna` on `main` was **behind** `origin/main` and left untouched (local mods preserved). Prior WIP existed on `fix/notif-fcm-001-backend`; delivery-semantics changes were ported into the clean backend feature branch above.

---

## 2. Root cause (confirmed vs hypothesis)

### Confirmed (code + live probe)

1. **False push success on backend (`origin/main`)**  
   When Firebase credentials are missing/unavailable, `send_notification` still:
   - creates in-app history
   - marks status `sent`
   - increments `success_count`
   - returns HTTP `201`  
   DAL only persists `error_message` for `failed`, so the “Firebase not configured” note was dropped.

2. **Misleading health on live `dev-api`**  
   `GET https://dev-api.eduvijna.com/api/notifications/health` → `200`  
   Body: `provider=FCM`, `provider_status=connected`  
   On baseline code this is a stub (`connected` without real credential/init proof). **Does not prove G4/G5.**

3. **Mobile Expo Push Token fallback (baseline)**  
   `PushNotificationService.getToken` called `getExpoPushTokenAsync` when native FCM failed and could register `ExponentPushToken[…]` to a backend that only speaks Firebase Admin / raw FCM.

4. **Token refresh unwired (baseline)**  
   `handleTokenRefresh` existed but `addPushTokenListener` was never subscribed.

5. **Dead native module path**  
   `FirebasePushNative.ts` / claimed Kotlin modules are absent from the built Expo tree. Live path is `expo-notifications` + `google-services.json`.

### Hypotheses (need physical / runtime credential proof)

- H1: Deployed `dev-api` may lack a valid `FIREBASE_CREDENTIALS_PATH` / service-account for `eduvijna-push`, so historical physical `201` was inbox-only.  
- H2: If credentials exist but project/sender mismatch vs app `416066207556`, FCM rejects tokens (sender_id_mismatch).  
- H3: OPPO ColorOS battery / notification channel / Play Services can suppress display even after FCM accept (OEM).  
- H4: Historical registered token may have been Expo-format if native acquisition failed once.

Historical physical evidence (2026-10-18 OPPO CPH1823): API `201` + 1 active Android token + **no device receipt** — consistent with confirmed false-success and/or H1–H3.

---

## 3. Component matrix (audit)

| Component | Implemented | Runtime verified | Evidence | Failure | Required fix |
|---|---|---|---|---|---|
| Push permission | Yes (`expo-notifications`) | Unit | Service + Profile | — | None |
| Android channel `default` | Yes | Not on device | Service module init | OEM may still mute | Physical check |
| Native FCM token | Yes via `getDevicePushTokenAsync` | Unit | New tests | Expo fallback (fixed) | Done on feature branch |
| Expo fallback | Removed on feature branch | Unit | Tests assert no Expo call | Was policy violation | Done |
| Token register API | Yes `POST /devices` | Not E2E | Service | Could accept Expo (mobile+API now reject) | Done |
| Login/logout/switch | Yes (detach / reconcile) | Unit (account scope) | Existing tests | — | Preserve |
| Token refresh listener | Wired on feature branch | Unit | `subscribeToTokenRefresh` | Was unwired | Done |
| FG/BG/cold tap routing | Yes (`appPushNotificationResponse`) | Unit | Existing tap tests | Physical tap blocked | Needs device |
| Mobile Firebase config | `eduvijna-push` / `416066207556` / `com.eduvijna.app` | File inspect | `google-services.json` | Backend identity unverified | Runtime blocker |
| Backend Firebase init | Admin SDK path | Health stub only | Live health `connected` | False success / stub health | Feature branch fix |
| Provider outcome counters | Added on feature branch | Unit pytest | Hardening tests | Baseline inflated success | Done (undeployed) |
| In-app history/polling | Independent | Prior physical PASS | Handoff 20261018 | Must preserve | Preserve |

---

## 4. Exact changed files

### Mobile (`fix/push-fcm-delivery-p0`)

| File | Rationale |
|---|---|
| `src/core/services/PushNotificationService.ts` | Native-FCM-only; reject Expo; force refresh option; refresh subscription helper; validation errors not remapped as network |
| `App.tsx` | Subscribe `addPushTokenListener` with cleanup |
| `src/__tests__/setup.ts` | Mock `getDevicePushTokenAsync` / `addPushTokenListener` |
| `src/__tests__/PushNotificationService.fcmToken.test.ts` | Mandatory token-path regressions |

### Backend (`fix/push-fcm-delivery-semantics-p0`)

| File | Rationale |
|---|---|
| `app/services/push_notification_service.py` | Separate in-app success from push acceptance; never count unconfigured FCM as push success |
| `app/schemas/push_notification_schemas.py` | Optional `push_*` counters; reject Expo tokens; honest health schema fields |
| `app/utilities/push_providers/fcm_provider_admin_sdk.py` | Classify errors; deactivate only permanent token failures; local health |
| `app/api/push_notifications/push_notification_controller.py` | Lazy init; honest health; send authorization hardening (ported) |
| `app/dal/push_notification_dal_postgrest.py` | School map helper for send tenancy |
| `app/services/notification_click_url.py` | Sanitize click actions |
| `app/services/notification_send_authorization.py` | School-scoped send authorization |
| `tests/services/test_push_notification_fcm_hardening.py` | False-success + token lifecycle tests |
| `tests/services/test_notification_send_authorization.py` | Authz unit tests |

---

## 5. Before / after architecture

**Before (broken semantics):**

```text
App → (FCM or Expo token) → POST /devices
Instructor → POST /send → 201 + success_count++
  even if Firebase missing → status=sent (looks delivered)
Health → provider_status=connected (stub)
```

**After (feature branches, undeployed):**

```text
App → native FCM only → POST /devices (Expo rejected)
Instructor → POST /send → 201 means in-app stored
  body: success_count=in_app_saved
        push_accepted_count / push_failed_count / push_not_configured_count / …
  Firebase missing → status=failed error=push_not_configured; push_not_configured_count++
Health → not_configured | initialized | error (local only; not OS delivery proof)
```

Token lifecycle: logout detaches account association (DELETE device id) without deleting OS FCM token; next login reconciles registration.

---

## 6. Firebase configuration (redacted)

| Layer | Value | Status |
|---|---|---|
| Mobile `google-services.json` | project `eduvijna-push`, number `416066207556`, package `com.eduvijna.app` | MATCH expected |
| `app.json` android.package | `com.eduvijna.app` | MATCH |
| Backend service-account project | — | **BLOCKED** — no authorized credential file inspection in this session; `.env` not present in feature worktree |
| Live `dev-api` health | `provider_status=connected` (baseline stub) | **Not proof** of Admin SDK / project alignment |

Do not rotate or download credentials without Founder approval.

---

## 7. Automated test results

| Suite | Result |
|---|---|
| Mobile `PushNotificationService.fcmToken.test.ts` | **7/7 PASS** |
| Mobile `pushNotificationAccountScope.test.ts` | PASS |
| Mobile `appPushNotificationResponse.test.ts` | PASS |
| Backend `test_push_notification_fcm_hardening.py` + authz | **25/25 PASS** (venv: `eduvijna-api-main-rollout\.venv`) |
| Full mobile lint/typecheck/Android build | Not run this session |
| Physical device suite | **BLOCKED** — `adb devices` empty |

---

## 8. Physical-device results

| Gate | Result |
|---|---|
| G1 native FCM token | BLOCKED (no device) — unit covered |
| G2 Firebase project aligned end-to-end | BLOCKED (backend identity) |
| G3 token registered to account | BLOCKED |
| G4 Admin init succeeds | BLOCKED |
| G5 FCM accepts message | BLOCKED — **201 alone invalid** |
| G6–G11 display / tap | BLOCKED |
| G12 token rotation / account switch | Unit covered; physical BLOCKED |
| G13 mobile regression | PARTIAL (focused tests) |
| G14 in-app bell/history | Not re-run; code path unchanged for polling |
| G15 unrelated regressions | Not fully exercised |

---

## 9. Remaining blockers

1. **No physical Android device** attached for G1/G5–G11.  
2. **Backend Firebase credential/project identity** on `dev-api` not verified with authorized access.  
3. **Feature branches not pushed / PRs not opened / not deployed** (per Founder approval rule).  
4. Live health still baseline stub until backend branch is deployed.  
5. Optional: Profile debug still re-fetches device token separately (non-blocking).

---

## 10. PR links and SHAs

| Item | Value |
|---|---|
| Mobile branch | `fix/push-fcm-delivery-p0` (local worktree; **not pushed**) |
| Mobile base SHA | `b42bcd1` |
| Backend branch | `fix/push-fcm-delivery-semantics-p0` (local worktree; **not pushed**) |
| Backend base SHA | `2de33f07` |
| PR URLs | **None yet** — awaiting Founder go-ahead to push/open draft PRs |

---

## 11. Founder acceptance procedure

1. Review this diagnosis; approve push of both feature branches as **draft PRs** (do not merge).  
2. Authorize backend deploy of `fix/push-fcm-delivery-semantics-p0` to **dev only**.  
3. Verify `GET /api/notifications/health` reports real local state (`not_configured` or `initialized`), never stub `connected`.  
4. Confirm service-account project_id matches `eduvijna-push` (redacted ops check).  
5. Build/install authorized Android **dev client / APK** from mobile feature branch (not Expo Go).  
6. On OPPO (or authorized device): enable push → confirm native FCM token (not Expo) → register.  
7. Send test notification; require `push_accepted_count >= 1` and Firebase message id logged (redacted) — **not** mere HTTP 201.  
8. Validate FG / BG / terminated display + tap destinations (G7–G11).  
9. Only then set physical flags true and consider Founder acceptance.

**Do not** treat historical or new `201` alone as delivery proof.
