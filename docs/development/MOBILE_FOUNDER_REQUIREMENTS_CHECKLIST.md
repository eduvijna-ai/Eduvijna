# Mobile founder program — requirement checklist

Last updated: 2026-10-10 (Cursor). API: `https://dev-api.eduvijna.com` only.

**Stack:** PR [#18](https://github.com/eduvijna-ai/Eduvijna/pull/18) (Phase 1 only; no Phase 2 imports) → PR [#19](https://github.com/eduvijna-ai/Eduvijna/pull/19) (`loadStudentDashboardQuizzes`, classifier) → PR [#20](https://github.com/eduvijna-ai/Eduvijna/pull/20) docs seeds.

| ID | Requirement | Implementation | Review | Technical verification | Founder E2E |
|----|-------------|----------------|--------|------------------------|-------------|
| P1 | Assigned quiz PUT→POST + `attended-quiz` | PR #18 services | Codex requested | Jest + parity doc | Pending |
| P1 | Recovery checkpoint + View Results probe | PR #18 | Codex requested | Jest navigation suites | Pending |
| P1 | Home Recent Completions → shared resolver | `executeStudentAssignedQuizViewResults` | PR #18 | `studentHomeViewResults` test | Pending |
| P1 | Notifications + OpenQuiz + push graded → shared resolver | `executeStudentAssignedQuizViewResults` | PR #18/#19 | Jest + openQuiz flow | Pending |
| P1 | Clear stale checkpoint after server persistence | `clearStaleCheckpointWhenPersistedOnServer` | PR #18 HEAD | View-results test expects `removeItem` | Pending |
| P1 | Trace script (read-only, redacted) | `scripts/compare-assigned-quiz-dev-api.mjs` | — | Run with env creds → `e2e-fixtures/mobile-quiz-react-parity-traces.json` | N/A |
| P2 | Assignment classifier (window, `has_time_limit`, missed/upcoming) | `studentAssignmentClassification.ts` + `checkRecordToQuiz` | PR #19 | `studentAssignmentClassification.test.ts` | Pending |
| P2 | Ongoing includes `in_progress` / `started` | `isStudentQuizOngoing` | PR #19 | `quizFilters.ongoing.test.ts` | Pending |
| P2 | Analytics View Results recovery | `executeStudentAssignedQuizViewResults` in `QuizStudentMyAnalyticsScreen` | PR #19 (not duplicated on #18) | navigation tests | Pending |
| P2 | `completed_at` never from due date | `checkRecordToQuiz` | PR #19 | `studentDashboardData` test | Pending |
| P2 | Correct counts only when verified | `formatVerifiedCorrectAnswerCount` | PR #19 | Unit + UI omit | Pending |
| P2 | Shared dashboard list + refresh | `loadStudentDashboardQuizzes` | PR #19 | Jest | Pending |
| P3 | Assessments / worksheets / From Books doc | Branch `feat/mobile-phase3-document-quiz-worksheets` | — | Doc vs dev.eduvijna.com | Pending |
| P4 | Role/profile + unwanted popups | Branch `feat/mobile-phase4-role-profile-popups` | — | TBD | Pending |
| P5 | Deep links | Branch `feat/mobile-phase5-deep-links` | — | TBD | Pending |
| P6 | Push + bell lists + profile prefs | Branch `feat/mobile-phase6-push-notifications` | — | TBD | Pending |
| — | ERP notifications | Deferred | — | — | Deferred |

## Technical evidence (redacted)

| Artifact | Status |
|----------|--------|
| `docs/development/MOBILE_QUIZ_REACT_REQUEST_PARITY.md` | Static parity matrix |
| `docs/development/e2e-fixtures/mobile-quiz-react-parity-traces.json` | Pending env login (`EDUVIJNA_DEV_USERNAME` / `EDUVIJNA_DEV_PASSWORD`) |
| `docs/development/e2e-fixtures/technical-verification-redacted.json` | Pending `.dev-api-credentials.local.json` or env; run `node scripts/dev-api-technical-verify.mjs` |

## Auth contract (mobile = Quiz-React)

`POST /api/v1/auth/login` with `username_or_email`, `password`, `remember_me`, `device_info`, `client_type: mobile`.

Do not commit credentials or raw login responses.

## Founder-only

Final emulator E2E on Metro **8082** (do not restart Metro/emulator from Cursor).
