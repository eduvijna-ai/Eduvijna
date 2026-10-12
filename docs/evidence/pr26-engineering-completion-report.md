# PR #26 engineering completion report

**Pending investigation (closed):** See `analytics-pending-investigation.md`. API/normalised data show attempt **207** completed at **60%**; failed runs opened **another assignment**. Fixture E2E selection is verified on **Expo web** via session-scoped testIDs + quiz-list pagination (page index is dataset-dependent, not a permanent fixture property).

**Tested implementation SHA (pre-push):** `ca92084904abff99a21e47aac52bfa2902dd8f0e` — update to post-push `git rev-parse HEAD` after merge commit.

| Requirement | Implementation status | Android (auto / manual) | Expo web | Evidence / remaining failure |
| --- | --- | --- | --- | --- |
| Build identity (bundle = HEAD) | Done | N/A | Pass (`exactMatch`) | `docs/evidence/loaded-build-identity.json` |
| Assessments → fixture → Aarya → attempt 207 (60%, 6/10) | Done | Auto **Fail** (not re-run green) | **Pass** (automated) | `web-journey-a-b-latest.json`, local `web-journeys/journey-a.json` |
| Analytics → Aug range → class → **exact session** → saved result | Done (scoped pagination, web nav bridge) | Auto **Fail** (quiz/summary pagination; UIAutomator) | **Pass** (automated) | `web-journeys/journey-b.json`; Android `journey-b.json` stops at view_analytics |
| Journey-logic unit tests | Fixed (stale XML fixture) | N/A | N/A | `npm run test:journey-logic` 6/6 |
| Analytics helpers / assignment tests | Done | N/A | N/A | Jest `teacherAnalyticsHelpers.assignment.test.ts` |
| Web instructor Analytics (QuizTeacherAnalytics) | **Fixed** (was legacy web Analytics + wrong nav target) | N/A | Verified via Journey B | `App.tsx`, `WebNavigation.tsx` |
| Web `QuizResultsScreen` from Analytics | **Fixed** (`setWebNavigateHandler`) | N/A | Verified | `navigationService.ts` |
| Scoped analytics pagination (quiz/summary/attempt) | Done | Partial (automation) | Verified | `AnalyticsPagination.tsx` |
| From Books OFF/ON → preview → save → history | Implemented; runtime E2E | Not run | Not run (smoke) | `documentCurriculumGeneratedHandoff.integration.test.tsx` only |
| Saved-books vs catalogue parity | Implemented | Not run | Not run | `books-from-parity-table.md`, service unit coverage |
| EducationalContent surfaces | Partial audit | Not run | Not run | Component-level; no full runtime sweep |
| Option identity through submit/review | Unit pass | Not run | Not run | `optionIdentity.persistence.test.ts` |
| Document History / Recent Completions relaunch | Screens + tests exist | Not run | Not run | Service/screen tests |
| Deep-link / quiz-nav guards | Hook + tests | Not run | Not run | `useQuizNavScreenAccess`, webShell tests |
| Cold launch (Android) | Not run this pass | Not run | N/A | — |
| Physical device push | Out of scope | **Unverified** | N/A | Release gate |

**READY FOR FOUNDER EMULATOR E2E:** **No** — Expo web fixture journeys pass on `ca92084…`, but Android automated acceptance and several product runtime sweeps are still open.

**Physical device / release:** Push notifications and production deploy remain separately gated.
