# PR #28 — Mobile Final Regression Closure (2026-11-02)

Worktree: `d:\wt\eduvijna-mobile-push-p0`  
Branch: `fix/push-fcm-delivery-p0`  
DRAFT PR: https://github.com/eduvijna-ai/Eduvijna/pull/28  
No code changes in this closure pass. PR remains DRAFT. No merge / deploy / APK / physical device run.

## Status fields

```text
MOBILE_PR_HEAD_SHA=61a48dd1af7c98a8d3d3e786d02d57fd0232ba99
FULL_JEST_PASS=false
JOURNEY_LOGIC_PASS=true
NEW_MOBILE_REGRESSIONS=0
BASELINE_FAILURES=6 suites (pre-existing on main b42bcd1)
MOBILE_BUNDLE_PASS=true
CI_GATES_STATUS=none (statusCheckRollup empty; DRAFT)
MOBILE_CODE_READY_FOR_PHYSICAL_TEST=true
PHYSICAL_FCM_DELIVERY_VERIFIED=false
READY_FOR_FOUNDER_ACCEPTANCE=false
```

## Task 1 — Full mobile regression

| Command | Result | Evidence |
|---|---|---|
| `npm test` @ `61a48dd` | Suites: **6 failed**, 2 skipped, **145 passed** (151/153). Tests: **8 failed**, 34 skipped, **601 passed** (643). Time ~304s | terminal `662932` |
| `npm run test:journey-logic` | **pass 28 / fail 0** | this closure re-run |
| Focused notification Jest | **8 suites / 37 tests PASS** | this closure re-run |

Focused suites green: `PushNotificationService.fcmToken`, `pushNotificationAccountScope`, `appPushNotificationResponse`, `pendingNotificationIntent`, `notificationNavigation`, `gradedNotificationRouting`, `notificationReadState`, `notifications.api.readState`.

### Failing suites (full Jest)

1. `CreateHandwrittenQuizScreen.test.tsx`
2. `assignedQuizRecovery.integration.test.ts`
3. `assessmentWorkspace.store.test.ts`
4. `QuizTeacherAnalyticsScreen.drilldown.test.tsx`
5. `StudentDashboard.render.test.tsx`
6. `traceRedact.test.ts` (Jest ESM transform / `Unexpected token 'export'` on `scripts/lib/trace-redact.mjs`)

None of these paths appear in `git diff --name-only origin/main...HEAD` for PR #28.

## Task 2 — Baseline comparison

Main baseline workspace: PlayRelease @ `b42bcd1acdbb2202792335c695c6da9da9e180f6` (detached HEAD; not modified this pass beyond prior independent-deps bundle validate).

Same 6 suites re-run:

| Workspace | Suites | Tests |
|---|---|---|
| PR `61a48dd` (terminal `662933`) | 6 failed / 6 | 8 failed, 51 passed |
| main `b42bcd1` (terminal `662934`) | 6 failed / 6 | 9 failed, 50 passed |

**Classification:** all 6 suite failures = **pre-existing on main** (test harness / unrelated product areas).  
**NEW_MOBILE_REGRESSIONS = 0.** No PR-introduced mobile regressions to fix. Notification behavior not rewritten.

## Task 3 — Bundle validation (preserved)

Prior independent-deps export at PR HEAD `61a48dd` (PlayRelease detached checkout; exit 0; terminal `662931`):

- Android: `.expo-export-check/android-dev` → `_expo/static/js/android/index-c362e6a8c7c3ddd2419aad0456e7c774.hbc` (9.02 MB)
- iOS: `.expo-export-check/ios-dev` → `_expo/static/js/ios/index-90d0374f282842af4b0c892364b96b5b.hbc` (9 MB)

Artifacts retained under `D:\Eduvijna-Android-App\Eduvijna-PlayRelease\.expo-export-check\{android,ios}-dev`.  
Metro / shared junctions / PlayRelease branch tip not altered in this closure.

## Task 4 — Final PR review (code + tests)

| Check | Status |
|---|---|
| Native FCM-only registration (`getDevicePushTokenAsync`; no Expo fallback call) | PASS — `getExpoPushTokenAsync` appears only in reject/documentation comment |
| Both Expo formats rejected (`ExponentPushToken` / `ExpoPushToken`) | PASS |
| Refresh / account reconciliation (`subscribeToTokenRefresh`, launch `forceRefresh`) | PASS + covered by focused tests |
| No duplicate token generation (Profile / BottomTab use shared `enablePushNotifications`; refresh prefers listener token) | PASS |
| No sensitive token logging (redacted logs / `safePushError`) | PASS |
| Notification history / read-state | PASS (`notificationReadState`, `notifications.api.readState`) |
| Notification tap navigation | PASS (`notificationNavigation`, `gradedNotificationRouting`, `appPushNotificationResponse`, `pendingNotificationIntent`) |
| API response compatibility (device register; no backend interface change) | PASS (mobile-only) |
| No new mobile TypeScript errors in PR push surface | PASS (prior closure: PR-file tsc clean; repo-wide noise pre-existing / improved vs main) |

## Commits on branch (vs `origin/main`)

```text
61a48dd test(notifications): align read-state assertions with canonical ID keys
4c2b966 fix(push): complete SDK 54 notification handler fields and redact classroom IDs
d20ef0b chore(push): remove unused diagnostic storage import
79b3cea fix(push): avoid misleading delivery claims and sensitive send logs
f199544 fix(push): reject both Expo token formats and correct mobile push test diagnostics
2f7a760 fix(push): reconcile FCM token on launch and avoid duplicate Profile token reads
7f01128 docs: add push P0 draft-PR preflight and Founder GO/NO-GO handoff
afe2241 fix(push): require native FCM tokens for direct Firebase delivery
```

**Newly created mobile commits this closure pass:** none.

## Gates not claimed

- Physical FCM delivery not run / not verified.
- Founder acceptance not claimed.
- PR #28 left DRAFT; CI rollup empty (no required checks observed).
