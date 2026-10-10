# Mobile founder program - requirement checklist

Last updated: 2026-10-10 (Cursor). API: `https://dev-api.eduvijna.com` only.

**Stack:** [#18](https://github.com/eduvijna-ai/Eduvijna/pull/18) -> [#19](https://github.com/eduvijna-ai/Eduvijna/pull/19) -> [#21](https://github.com/eduvijna-ai/Eduvijna/pull/21) runtime -> [#22](https://github.com/eduvijna-ai/Eduvijna/pull/22) -> [#23](https://github.com/eduvijna-ai/Eduvijna/pull/23) -> [#24](https://github.com/eduvijna-ai/Eduvijna/pull/24). Docs-only [#20](https://github.com/eduvijna-ai/Eduvijna/pull/20).

| ID | Requirement | Implementation | Review | Technical verification | Founder E2E |
|----|-------------|----------------|--------|------------------------|-------------|
| P1 | Assigned quiz PUT->POST + attended-quiz | PR #18 services | Codex requested | Jest + parity doc | Pending |
| P1 | Recovery checkpoint + View Results probe | PR #18 | Codex requested | Jest navigation suites | Pending |
| P1 | Home Recent Completions -> shared resolver | `executeStudentAssignedQuizViewResults` | PR #18 | `studentHomeViewResults` test | Pending |
| P1 | Notifications + OpenQuiz + push graded -> shared resolver | `executeStudentAssignedQuizViewResults` | PR #18/#19 | Jest + openQuiz flow | Pending |
| P1 | Clear stale checkpoint after server persistence | `clearStaleCheckpointWhenPersistedOnServer` | PR #18 HEAD | View-results test expects `removeItem` | Pending |
| P1 | Trace script (read-only, redacted) | `scripts/compare-assigned-quiz-dev-api.mjs` | - | Run with env creds | N/A |
| P2 | Assignment classifier | `studentAssignmentClassification.ts` | PR #19 | `studentAssignmentClassification.test.ts` | Pending |
| P2 | Ongoing includes in_progress / started | `isStudentQuizOngoing` | PR #19 | `quizFilters.ongoing.test.ts` | Pending |
| P2 | Analytics View Results recovery | `executeStudentAssignedQuizViewResults` | PR #19 | navigation tests | Pending |
| P2 | completed_at never from due date | `checkRecordToQuiz` | PR #19 | `studentDashboardData` test | Pending |
| P2 | Correct counts only when verified | `formatVerifiedCorrectAnswerCount` | PR #19 | Unit + UI omit | Pending |
| P2 | Shared dashboard list + refresh | `loadStudentDashboardQuizzes` | PR #19 | Jest | Pending |
| P2 | Home upcoming visible + boundary reclassify | `StudentDashboard` + `useStudentAssignmentBoundaryClock` | PR #19 HEAD | `reapplyStudentAssignmentClassification.test.ts` (+ inactive `is_active` untimed) | Pending |
| P2 | Classroom name enrichment best-effort | `fetchStudentClassroomNameLookup` + `loadStudentDashboardQuizzes` | PR #19 | `studentDashboardData.service.test.ts` (lookup transport/JSON failure) | Pending |
| P3 | Document workspace / From Books / history | PR #21 | Codex requested | Jest + web shell tests | Pending |
| P3 | Web history New -> DocumentUploadHome | `QuizTakingScreen` web branch | PR #21 | Manual web | Pending |
| P3 | Live submission matrix (strict) | `scripts/dev-api-submission-matrix.mjs` | PR #21 HEAD | `submission-matrix-redacted.json` **passed**; cleanup = explicit API limitation; `dev-api-submission-matrix.runner.test.mjs` | Pending |
| P3 | Trace redaction camelCase resource IDs | `scripts/lib/trace-redact.mjs` | PR #19 | `trace-redact.test.mjs` | N/A |
| P4 | Profile display name parity | `getDisplayName` web/mobile | PR #22 | Profile screens | Pending |
| P4 | Push prompt once per login | `BottomTabNavigator` ref guard | PR #22 | Mobile login | Pending |
| P5 | Web /openquiz post-login | `App.tsx` `resumePendingOpenQuiz` | PR #23 | `deepLinkService.test.ts` | Pending |
| P6 | Web bell -> handleOpenQuiz | `WebNavigation` | PR #24 | `webNavigationNotification.test.tsx` | Pending |
| P6 | Instructor/admin OpenQuiz -> preview before public branch | `openQuizHandler.ts` | PR #24 HEAD | `openQuizHandler.roleRouting.test.ts` (public/private student vs teacher) | Pending |
| P6 | QuizPreview route params on web | `App.tsx` | PR #24 | Web preview | Pending |
| - | ERP notifications | Deferred | - | - | Deferred |

## Technical evidence (redacted)

| Artifact | Status |
|----------|--------|
| `docs/development/e2e-fixtures/technical-verification-redacted.json` | Run-scoped fixture probes + redaction |
| `docs/development/e2e-fixtures/submission-matrix-redacted.json` | Cross-process checkpoint matrix (**status=passed**, redacted comparisons) |
| `docs/development/e2e-fixtures/mobile-quiz-react-parity-traces.json` | Read-only student parity trace (regenerated dev-api) |

## Auth contract (mobile = Quiz-React)

`POST /api/v1/auth/login` with `username_or_email`, `password`, `remember_me`, `device_info`, `client_type: mobile`.

Do not commit credentials or raw login responses.

## Founder-only

Final emulator E2E on Metro **8082** (do not restart Metro/emulator from Cursor).
