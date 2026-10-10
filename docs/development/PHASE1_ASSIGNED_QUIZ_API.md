# Phase 1 — assigned quiz API contracts (dev-api)

Target API: **`https://dev-api.eduvijna.com`**. No production deployment or OTA from this work.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/dashboard/attended-quiz` | Load persisted student submission (`student_id`, `session_id`, `quiz_id`) |
| `GET` | `/api/v1/dashboard/quiz-attempts` | List attempts scoped by `quiz_id`, `student_id`, `class_id` (= assignment `session_id`) |
| `POST` | `/api/v1/dashboard/quiz-attempts` | Create attempt (`status: started`) |
| `PUT` | `/api/v1/dashboard/quiz-attempts/:id` | Finalize attempt (`score`, `status: completed`, `completed_at`, `time_spent_seconds`) |
| `POST` | `/api/v1/dashboard/quiz-submissions` | Persist `log_data` + `score` (`classroom_id` = assignment `session_id`). **No `attempt_id` field.** |

## quiz-submissions ↔ quiz-attempts (OpenAPI, 2026-10-10)

Source: `GET https://dev-api.eduvijna.com/openapi.json` (`Eduvijna Educational Platform API` 3.1.0). `/docs` loads; this file is the published contract.

| Operation | Schema | Attempt linkage |
|-----------|--------|-----------------|
| `POST /api/v1/dashboard/quiz-submissions` | `QuizSubmissionCreateRequest`: `quiz_id`, `student_id`, `classroom_id`, `score`, optional `summary` / `log_data` / `submitted_at` | **No `attempt_id` property.** Response `QuizSubmissionResponse` also has no attempt id. |
| `PUT /api/v1/dashboard/quiz-attempts/{attempt_id}` | `QuizAttemptUpdateRequest`: `score`, `status`, `completed_at`, `time_spent_seconds` | Updates that attempt only. **No `log_data` / answers.** |
| `POST /api/v1/quiz/submit` | `QuizSubmissionCreate`: `quiz_id`, `student_id`, `classroom_id`, `score` | **No `log_data`, no `attempt_id`.** Cannot persist assigned answers. |
| `PUT`/`PATCH` `/quiz-submissions` | **Absent** | No update/attach path. |

`log_data` is an unconstrained object. **Do not treat `log_data.attempt_id` as an API attachment key** — it is not in the schema.

**Backend dependency (blocking a client sequencing change):** the only documented way to persist assigned-quiz answers is `POST /quiz-submissions`, and that operation is **not** specified to attach to an existing `quiz_attempts` row. OpenAPI does not describe a side-effect that inserts another attempt, nor a field that prevents one. Reordering PUT/POST, omitting POST, or sending an undocumented top-level `attempt_id` would be an unverified workaround.

**Authorized development fixture:** **Pending.** Record `GET /quiz-attempts` id+status immediately before and after one `POST /quiz-submissions` for a known `started` attempt. No unauthenticated login probe this pass.
| `GET` | `/api/v1/quiz?session_id=…` | Full assigned quiz payload (question ordering) before start/recovery |
| `GET` | `/api/v1/dashboard/teacher-quizzes` | Teacher result load (`view_type=all`, `quiz_id`) with strict student/session/attempt matching |

## Verification status (2026-10-10 execution)

| Check | Status | Evidence |
|-------|--------|----------|
| Jest: submission, recovery integration, retrieval, navigation, `QuizTakingScreen` recovery, normalization | **Verified** | Assigned-quiz + results suites including sparse-log / unanswered / score-0 cases |
| `tokenStorage` dev/prod isolation + SecureStore key format | **Verified** | `tokenStorage.apiEnvironment.test.ts`, `auth.api.nativeStorage.test.ts` (PR #16) |
| `npm run config:verify` / `cli:verify` | **Verified** | Stack branches |
| TS vs PR #17 base (same `node_modules`, `tsc --noEmit`) | **Verified** | **186** (#18) / **195** (#17) — **0 diagnostics added**. Removed vs #17: `apiEnvironment.test.ts` ProcessEnv (2), unused `url` in `config.ts`, unused `checkQuizAvailability` in `openQuizHandler.ts`, ERP `cake-outline` (2), `AuthErrorHandling.example` token setters (2), unused `formatDuration` in `QuizStudentMyAnalyticsScreen.tsx`. No `quizResultNormalization.ts` errors. |
| Live dev-api TLS reachability | **Verified** | Existing stack host check; no additional unauthenticated login probes |
| Live dev-api login | **Pending** | Authenticated login not executed this pass |
| Emulator `emulator-5554` | **Verified** | `adb devices` → `device` (Founder emulator not restarted) |
| Metro **8082** | **Pending / preserved** | Existing Metro session must remain on **8082**; not reset this pass |
| Authenticated emulator checks (login, recovery, attended-quiz read) | **Pending** | Not executed until Founder-authenticated device login |
| Authorized before/after attempt list around one `POST /quiz-submissions` | **Pending** | Requires a development student token; OpenAPI contract recorded above |

## Manual matrix (when authenticated)

1. Partial submit (checkpoint) → force-stop → reopen from **Assessments** and **OpenQuiz** → saved answers and immutable grade on retry → **Quiz Results** shows persisted score (not local recompute).
2. Teacher results: wrong `session_id` / `attemptId` → error, not another student’s row.

Do not upload production documents or modify store signing.
