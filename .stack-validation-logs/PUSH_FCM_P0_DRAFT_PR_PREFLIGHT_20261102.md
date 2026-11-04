# EduVijna — P0 Push Draft PRs & Pre-Deployment Review (2026-11-02)

## Status fields

```text
DRAFT_PRS_CREATED=true
CODE_REVIEW_PASS=true
CI_GATES_PASS=false
DEV_DEPLOYMENT_PREFLIGHT_PASS=false
FCM_PROVIDER_VERIFIED=false
PHYSICAL_DELIVERY_VERIFIED=false
READY_FOR_FOUNDER_ACCEPTANCE=false
```

**GO/NO-GO for development deployment: NO-GO** until an authorized operator confirms Firebase Admin SDK credentials on `dev-api` resolve to project `eduvijna-push` (project number `416066207556`) without exposing secret contents. Code is ready for a Founder-approved **dev-only** deploy after that check.

---

## 1. Draft PRs and SHAs

| Item | Value |
|---|---|
| Mobile DRAFT PR | https://github.com/eduvijna-ai/Eduvijna/pull/28 |
| Mobile head SHA | `afe224149fc6d80a668f25f841158b544c2a72c1` |
| Mobile `main` SHA | `b42bcd1acdbb2202792335c695c6da9da9e180f6` |
| Mobile branch | `fix/push-fcm-delivery-p0` |
| Backend DRAFT PR | https://github.com/eduvijna-ai/eduvijna-api/pull/409 |
| Backend head SHA | `d0392ee05c32b3b35ca48f246dadd7d7483b536f` |
| Backend `main` SHA | `2de33f07dc13149b76f7d51b4bf1a7ef10044ff2` |
| Backend branch | `fix/push-fcm-delivery-semantics-p0` |

Both PRs are **draft**. Neither merged. No deploy. No APK.

Note: Git remotes previously pointed at `github.com/eduvijna/Eduvijna` (moved to `eduvijna-ai/Eduvijna`). Mobile worktree origin was updated to `https://github.com/eduvijna-ai/Eduvijna.git` before successful PR creation.

---

## 2. Code review findings

### Mobile — PASS (scoped)

| Check | Result |
|---|---|
| Registers only native FCM | **PASS** — `getDevicePushTokenAsync` only; Expo fallback removed |
| Expo rejected for direct FCM | **PASS** — client `registerDevice` + enable path fail closed |
| Token refresh / stale cache | **PASS** — Expo cache purged; enable/refresh use `forceRefresh`; listener wired in `App.tsx` |
| Login/logout/account switch | **PASS** — detach association retained; reconcile path unchanged in intent |
| Tap / cold-start | **PASS** — `appPushNotificationResponse` listeners untouched except token subscription |
| Notification history/polling | **PASS** — no changes to inbox/polling modules |
| Unrelated mobile features | **PASS** — diff limited to push service, App push init, tests, handoff doc |

Review notes (non-blocking):
- ESLint still reports pre-existing `any` / restricted-import patterns in `PushNotificationService` / `App.tsx` (service already imported `apiClient` before this change).
- Dead `FirebasePushNative.ts` left in tree (unused); not recreated native Kotlin modules.

### Backend — PASS with compatibility notes

| Check | Result |
|---|---|
| Push counters vs in-app storage | **PASS** — `success_count` = in-app saved; optional `push_*` fields |
| Missing Firebase ≠ push success | **PASS** — `push_not_configured` + `push_not_configured_count`; status `failed` with reason |
| Expo token rejection | **PASS** — schema validator |
| Permanent vs transient token failures | **PASS** — `should_deactivate_token` / `permanent_failed_tokens` |
| Health does not expose secrets | **PASS** — local status enums only; no credential paths/contents in response |
| History preserved | **PASS** — create_notification still always attempted |
| Backward compatible API | **CONDITIONAL PASS** — additive optional response fields; **tightening**: Super Admin manual send requires `school_id`; `scheduled_at` rejected until a worker exists |

Automatic quiz assignment/completion senders are documented as not using the new manual school gate.

---

## 3. Automated verification

| Suite | Result |
|---|---|
| Mobile focused notification Jest (`PushNotification*`, tap, account, graded, pending, navigation) | **26/26 PASS** |
| Backend `test_push_notification_fcm_hardening` + `test_notification_send_authorization` | **25/25 PASS** |
| Backend `pytest tests/services/ -k "notification or push or fcm"` | **25 passed**, 787 deselected |
| Mobile ESLint on touched files | **FAIL** (pre-existing App/service lint debt; not new CI green) |
| GitHub Actions statusCheckRollup on both PRs | **empty / pending** at review time — no completed CI evidence |
| Full mobile `npm test` / Android build / EAS | **BLOCKED** (time/device; not run) |
| Physical device | **BLOCKED** — `adb devices` empty earlier; no physical PASS claimed |

`CI_GATES_PASS=false` because remote CI has not reported green checks and full matrix was not completed.

---

## 4. Compatibility assessment

- Clients reading only `success_count` / `notification_ids` continue to work; semantics of `success_count` are clarified as **in-app saved**, not OS delivery.
- Clients must use `push_accepted_count` (and related) to decide Firebase acceptance.
- HTTP `201` remains “accepted for processing / history created” — still **not** physical delivery.
- Manual Super Admin sends without `school_id` will receive **400** after deploy (intentional tenancy hardening).
- Mobile builds that still somehow hold Expo tokens will fail registration (desired).

---

## 5. Firebase configuration blockers

| Check | Status |
|---|---|
| Mobile `google-services.json` = `eduvijna-push` / `416066207556` / `com.eduvijna.app` | Verified in repo |
| Live `GET https://dev-api.eduvijna.com/api/notifications/health` | Still baseline stub: `provider_status":"connected"` |
| Backend Admin SDK project identity on `dev-api` | **BLOCKED** — requires authorized operator to confirm `FIREBASE_CREDENTIALS_PATH` exists in the runtime and that the **service-account `project_id`** equals `eduvijna-push` **without pasting secrets** |

Authorized operator action: on the **dev** API host/container only, confirm env path is set, file exists, and `project_id` matches (e.g. `jq -r .project_id` by ops). Do not commit, rotate, download, or paste credentials into chat/logs.

---

## 6. Proposed development-only backend deployment procedure

**Do not execute until Founder explicitly approves.**

1. Pre-check: DRAFT PR #409 reviewed; operator Firebase identity check complete; `FCM_PROVIDER_VERIFIED` can be set true by ops evidence.
2. Deploy **only** image/commit `d0392ee0` (or merge SHA if later amended) to **dev** (`dev-api.eduvijna.com`).
3. Post-deploy: `GET /api/notifications/health` must report `not_configured` | `initialized` | `error` — **never** stub `connected`.
4. Smoke: authenticated instructor/admin send to a **test user only**; assert response includes `push_accepted_count` or explicit `push_not_configured_count` / errors.
5. Confirm in-app notification history still lists the message.
6. Do not touch production; do not rotate Firebase keys as part of this deploy.

### Rollback

1. Redeploy previous known-good `main` image at `2de33f07` (or prior pinned digests).
2. Confirm health endpoint returns (even if stub) and send path responds.
3. Leave mobile DRAFT PR #28 unmerged; old APKs remain unaffected until a new build is installed.

### Correlation / diagnostics (privacy-safe)

- Prefer notification `id` + user_id + redacted token fingerprint in logs.
- Treat Firebase message IDs as success evidence for provider acceptance only.
- Never log full device tokens, JWTs, or service-account JSON.

---

## 7. Physical acceptance procedure — OPPO CPH1823 (Android 10)

Prerequisites: Founder-approved **dev** backend deploy; authorized APK/dev-client built from mobile `afe2241` (not Expo Go); USB debugging; test accounts isolated from production students.

| Gate | Procedure | Pass criteria |
|---|---|---|
| G1 | Enable push in Profile / prompt | Native FCM token acquired (not `ExponentPushToken`) |
| G2 | Inspect backend device list for test user (redacted) | Same token active for that account |
| G3 | Authorized send to that user | `push_accepted_count >= 1` + message id / provider accept (not mere HTTP 201) |
| G4 | App foreground | Notification displayed |
| G5 | App background | Notification displayed |
| G6 | App force-stopped / terminated | Notification displayed |
| G7 | Tap notification while signed in | Correct EduVijna screen |
| G8 | Signed-out tap → login | Pending intent resumes correct destination |
| G9 | Logout / second account / token refresh | Association detached; re-register; no duplicate poison Expo tokens |
| G10 | Smoke Home / Assessments / in-app bell | No unrelated regression vs prior physical suite |

**Do not mark any physical gate PASS without device evidence artifacts.**

---

## 8. Explicit recommendation

**NO-GO for development deployment today.**

Reasons:
1. Firebase runtime project identity on `dev-api` is unverified (`FCM_PROVIDER_VERIFIED=false`).
2. Live health still shows baseline stub `connected`.
3. Remote CI checks not yet green (`CI_GATES_PASS=false`).
4. Physical delivery cannot be validated until after a controlled dev deploy + APK install.

**Ready next step for Founder:** authorize ops Firebase identity check → then authorize **dev-only** backend deploy of PR #409 → then authorize APK build/install from PR #28 for OPPO G1–G10.
