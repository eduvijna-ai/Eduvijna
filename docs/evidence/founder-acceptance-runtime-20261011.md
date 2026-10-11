# Founder acceptance — runtime pass (2026-10-11)

**Branch:** `integration/mobile-founder-acceptance-20261011` (PR #26)  
**HEAD:** see `docs/evidence/meta.json` after latest push.

## Auth completion pass (`useAuth` + coordinator)

| Policy | Implementation |
|--------|----------------|
| Transient refresh/profile failure | No `clearAuthData`; `restoreSessionFromCache` + recoverable `error` |
| Credential rejection (401/403) | `clearCredentialsAtEpoch(outgoing)` only |
| Bounded waits | `raceWithBoundedWait` (15s refresh/profile); timer cleared in `finally` |
| Session guards | `createSessionScopedCommit` on user/auth/school/loading/error/dashboard resets |
| Login profile epoch | `login(credentials, sessionEpoch)` + `fetchAuthProfile(sessionEpoch)` |
| Logout vs new login | Outgoing credential epoch captured before bump; store clears gated on logout session epoch |
| Hook tests | `useAuth.lifecycle.test.ts` (5), `authLifecycle.policy.test.ts` (4), `authCredentialLifecycle.integration.test.ts` (4) |

## Login diagnosis (Android)

| Milestone | Instructor @ pre-fix run | Notes |
|-----------|------------------------|-------|
| Login form ready | PASS | |
| Fields located | PASS | |
| Inputs populated (sanitized) | PASS | username hash + password length only |
| API login probe (host) | PASS HTTP 200 | Proves credentials + dev-api reachability |
| In-app submit → shell | **FAIL** | **First failing boundary:** `in_app_login_no_navigation` / `authenticated_shell_timeout` |
| Root cause | | RN **controlled** `TextInput` does not receive `adb`/`clipboard` into React state; `login()` ran with empty email/password while host API succeeded |
| Fix | | `EDUVIJNA_ACCEPTANCE_ADB_LOGIN=1` + `acceptance-login.json` consumed in `Login.tsx`; `scripts/android-login.mjs` milestones + clipboard username + file trigger; login `testID`s |

Sanitized artifacts: `docs/evidence/login-milestones-sanitized-instructor.json` (no secrets). Raw XML under `.dev-api-document-workflow-run/` (gitignored).

**Re-verify:** Metro on 8082 with `EDUVIJNA_ACCEPTANCE_ADB_LOGIN=1`, reload dev-client bundle, `node scripts/android-login.mjs instructor|student`.

## Live UI journeys

| Journey | Status | Blocker |
|---------|--------|---------|
| A (479 / 70 / 207) | Not re-passed | Authenticated shell not reached in automation |
| B (Analytics 207) | Not re-passed | Same |
| Expo web login | Not re-run this push | Requires web Metro + DOM login pass |

Automation vs manual: host API login works; device UI login was automation/state binding, not backend rejection.

## Founder product requirements (implementation / runtime)

| Requirement | Code on branch | Runtime @ this SHA |
|-------------|----------------|---------------------|
| Assignment identity (quiz/session/class/student) | `Assessments` + `StudentList` + types | Blocked on login shell |
| Journey logic / metrics guards | `android-journey-logic.mjs` + tests | **PASS** (unit) |
| Auth session / credential epochs | Coordinator + `useAuth` | **PASS** (unit/integration) |
| From Books curriculum OFF/ON | `DocumentCurriculumFromBooksScreen` | Not exercised this pass |
| Educational content surfaces | Multiple screens under `document-upload` / content modules | Not exercised this pass |
| API-assigned modules / deep links | Phase 5/6 navigation + guards | Not exercised this pass |
| Answer identity → review | Quiz taking + submission paths (prior PR commits) | Not exercised this pass |
| Document history / recent completions | `documentAssessmentHistory.service`, dashboard handlers | Not exercised this pass |
| Android + web math/Markdown | Shared render components (prior work) | Not exercised this pass |

## Automated regression (this diff)

- `npm run test:journey-logic` — 6/6  
- `useAuth.lifecycle` + `authLifecycle.policy` + `authCredentialLifecycle` — pass  
- `apiRefreshCoordinator.*` / `apiClientAuthInterceptor` / assessments navigation tests — unchanged green from prior pass  

## Type-check

`npm run type-check` — no new auth/login module regressions vs integration baseline (pre-existing screen-level debt).
