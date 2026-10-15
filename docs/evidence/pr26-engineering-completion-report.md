# PR #26 engineering completion report

**Branch:** `integration/mobile-founder-acceptance-20261011`  
**Tested implementation SHA:** `9be36b796b80c3034cd944b7ba96389fb670589e` (post-push commit pending this evidence refresh)  
**API:** `https://dev-api.eduvijna.com` · **Metro:** `localhost:8082`

**READY FOR FOUNDER EMULATOR E2E:** **No** — Android automated journeys were not re-certified on final HEAD after emulator/login automation regression; web journeys and build identity are green on final HEAD.

| Gate | Result | Tested SHA | Evidence |
| --- | --- | --- | --- |
| Build identity (bundle = HEAD) | **PASS** | `9be36b7…` | `docs/evidence/loaded-build-identity.json` |
| `npm run test:journey-logic` | **PASS** (6/6) | `9be36b7…` | local run 2026-10-12 |
| Focused Jest (dashboard, saved-books, option identity, analytics helpers, document curriculum) | **PASS** | `9be36b7…` | `DocumentCurriculumFromBooksScreen.integration.test.tsx`, `savedBooks*.test.ts`, etc. |
| Broader Jest (assigned-quiz navigation probes) | **FAIL** (2 suites) | `9be36b7…` | `assessmentsAssignedQuizStart/ViewResults.navigation.test.ts` — `isAssignedQuizRecoveryProbeError` expectation; pre-existing on branch, not introduced by From Books work |
| `npm run type-check` | **FAIL** (repo-wide ~258 diagnostics) | `9be36b7…` | Baseline per `docs/development/STUDENT_ANALYTICS_STARTUP_FIX_20261011.md`; no new failures in touched From Books paths |
| `npm run lint` (repo-wide) | **FAIL** (baseline ~1798) | `9be36b7…` | Unchanged global baseline; new `savedBooksContent.service.ts` lint fixed |
| Web Journey A (479 / 70 / 207 / 60% / 6/10) | **PASS** | `9be36b7…` | `docs/evidence/web-journey-a-b-latest.json`, `.dev-api-document-workflow-run/runtime-evidence/web-journeys/` |
| Web Journey B (Analytics → session-scoped fixture) | **PASS** | `9be36b7…` | same |
| Android Journey A | **BLOCKED** | `9be36b7…` | Prior local pass in `android-journeys/journey-a.json` (same SHA session); **not** re-run green after emulator reset — login automation `in_app_login_no_navigation` (password/special-char + dev-client server pick) |
| Android Journey B | **BLOCKED** | `9be36b7…` | Last automated run failed at class selection; blocked on authenticated shell |
| From Books OFF/ON (unit + integration) | **PASS** | `9be36b7…` | `DocumentCurriculumFromBooksScreen.integration.test.tsx`, `savedBooks*.test.ts` |
| Saved-books vs catalogue | **PASS** (contract/unit) | `9be36b7…` | `docs/evidence/from-books-saved-books-parity-table.md` |
| EducationalContent runtime sweep | **NOT RUN** | — | Component tests only |
| Option identity | **PASS** (unit) | `9be36b7…` | `optionIdentity.persistence.test.ts` |
| Document History / Recent Completions | **PASS** (unit) | `9be36b7…` | existing screen/service tests |
| Deep-link / nav guards | **PASS** (unit) | `9be36b7…` | `useQuizNavScreenAccess` tests |
| Android cold launch | **NOT RUN** | — | Blocked on login automation |
| Dev bundle export | **PASS** | `9be36b7…` | `.expo-export-check/android-dev`, `ios-dev` |
| Prod bundle export | **PASS** | `9be36b7…` | `.expo-export-check/android-prod`, `ios-prod` |
| Stack export matrix (PR stack validate) | **NOT RE-RUN** this session | — | Use `scripts/stack-validate-pr-branches.mjs` on CI / prior `docs/development/e2e-fixtures/stack-validation-report.json` |
| Physical device push | **RELEASE GATE** | — | No device evidence |

## Engineering notes

- **From Books / saved-books:** Implemented parity services and screen wiring (`savedBooksContent.service.ts`, `DocumentCurriculumFromBooksScreen`); integration tests mock `@core/*` paths.
- **Android automation:** Added `scripts/lib/adb-ui-dump.mjs`, Metro `8082` picker in `android-dismiss-overlays.mjs`, login hardening in `android-login.mjs` (still blocked on in-app navigation after submit on API 36 emulator).
- **Analytics pending:** Closed — see `analytics-pending-investigation.md` (wrong assignment row, not API pending).

## Remaining engineering blockers before Founder handoff

1. Restore reliable Android instructor login on dev client (`127.0.0.1:8082`) and re-run `node scripts/android-founder-journeys.mjs all` on HEAD.
2. Close assigned-quiz navigation Jest failures or document as accepted baseline with base-branch proof.
3. Re-run stack export matrix and product runtime sweeps (EducationalContent, cold launch, From Books live capture).
