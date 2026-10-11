# Founder acceptance — runtime pass (2026-10-11)

**Branch:** `integration/mobile-founder-acceptance-20261011`  
**HEAD:** see `meta.json` in journey evidence after latest push.

## Architect repair pass (automation + credential lifecycle)

### Corrected findings

| Area | Defect @ `5c06f6d` | Fix |
|------|-------------------|-----|
| Journey `ensureInApp` | Checked **local dump path** for `com.eduvijna.app` | Reads **XML content** via `isEduvijnaAppForeground()` |
| Journey locate/tap | `tapLabelScroll` tapped then re-searched; double tap on student | **Locate-only** scroll helpers; single `tapTarget()` per action |
| Journey parsing | Fragile attribute-order regex | `android-ui-nodes.mjs` multiline `<node>` parser |
| Journey verification | Loose `/10/` `/6/` | `verifyWorksheetResultScreen()` requires labelled score/evaluated/correct + student + title |
| Journey exit code | Always 0 | `process.exit(1)` when requested journey fails |
| Logout lifecycle | `bump` then `logout()` cleared **new** epoch namespace | Capture **outgoing** `credentialEpoch` before bump; `clearCredentialsAtEpoch(outgoing)` |
| Session identity | Coordinator epoch ≠ hydrated storage epoch | `initializeAuthSessionIdentity()` + `restoreAuthSessionEpoch()` |
| Token writes | Implicit `getCredentialEpoch()` during async gaps | `storeAuthTokensForEpoch(sessionEpoch, …)` with explicit epoch |
| Marker persistence | Fire-and-forget | `await persistCredentialEpoch()` inside `bumpAuthSessionEpoch()` |

### Automated evidence (this pass)

| Suite | Result |
|-------|--------|
| `npm run test:journey-logic` (6 cases, XML fixtures) | **PASS** |
| `authCredentialLifecycle.integration.test.ts` | **PASS** (4) |
| `apiRefreshCoordinator.*` + `apiClientAuthInterceptor` | **PASS** |
| `assessmentsTeacherStudentList.navigation.test.ts` | **PASS** |

Redacted UI artifacts: `.dev-api-document-workflow-run/runtime-evidence/android-journeys/`

### Live UI (device)

| Journey | Result | Notes |
|---------|--------|-------|
| A (Assessments → 479 / session / student 70 → attempt 207) | **FAIL** | `eduvijna_shell_not_ready` after bootstrap (`loginResult.submitted`); automation fixes validated offline |
| B (Analytics independent) | **FAIL** | Same shell readiness blocker; no longer gated on A |

### Expo web

Not re-run in this pass (prior: login inputs timeout). Requires web dev server + form login script update.

## Type-check

Run `npm run type-check` — error count unchanged vs integration baseline (pre-existing screen-level TS issues; no new errors from auth/journey modules in this diff).
