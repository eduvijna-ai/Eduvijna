# Phase 1 — assigned quiz API contracts (dev-api)

Target API: **`https://dev-api.eduvijna.com`**. No production deployment or OTA from this work.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/dashboard/attended-quiz` | Load persisted student submission (`student_id`, `session_id`, `quiz_id`) |
| `GET` | `/api/v1/dashboard/quiz-attempts` | List attempts scoped by `quiz_id`, `student_id`, `class_id` (= assignment `session_id`) |
| `POST` | `/api/v1/dashboard/quiz-attempts` | Create attempt (`status: started`) |
| `PUT` | `/api/v1/dashboard/quiz-attempts/:id` | Finalize attempt (`score`, `status: completed`, `completed_at`, `time_spent_seconds`) |
| `POST` | `/api/v1/dashboard/quiz-submissions` | Persist `log_data` + `score` (`classroom_id` = assignment `session_id`) |
| `GET` | `/api/v1/quiz?session_id=…` | Full assigned quiz payload (question ordering) before start/recovery |
| `GET` | `/api/v1/dashboard/teacher-quizzes` | Teacher result load (`view_type=all`, `quiz_id`) with strict student/session/attempt matching |

## Verification status (2026-10-10 execution)

| Check | Status | Evidence |
|-------|--------|----------|
| Jest: submission, recovery integration, retrieval, navigation, `QuizTakingScreen` recovery | **Verified** | 34 tests (see PR #18 CI / local `npm test` filter) |
| `tokenStorage` dev/prod isolation + SecureStore key format | **Verified** | `tokenStorage.apiEnvironment.test.ts`, `auth.api.nativeStorage.test.ts` (PR #16) |
| `npm run config:verify` / `cli:verify` | **Verified** | Stack branches |
| TS vs baseline (`e6fde43` parent) | **Verified** | 199 head / 193 baseline errors; **1 new** in touched code: `openQuizAvailability` unused (pre-existing in file); no new errors in `tokenStorage`, `Assessments`, `QuizTakingScreen`, `assessmentQuizStart` |
| Live dev-api TLS reachability | **Verified** | `curl.exe` → dev-api host responds on HTTPS (no credentials used) |
| Live dev-api login | **Not executed** | `POST /api/v1/auth/login` returned **405** when probed without credentials — **not** counted as successful login |
| Emulator `emulator-5554` | **Verified** | `adb devices` → `device`; `sys.boot_completed=1` (emulator not restarted) |
| Metro **8082** | **Verified** | Existing dev session preserved (no port reset in this pass) |
| Authenticated partial submit → force-stop → Assessments/OpenQuiz recovery | **Blocked (Founder)** | Dev student login on device; partial submit; force-stop; reopen from Assessments and OpenQuiz |
| Attended-quiz read after live submit on device | **Blocked (Founder)** | Same login; complete or partial submit; confirm `GET /dashboard/attended-quiz` on device |

## Manual matrix (when authenticated)

1. Partial submit (checkpoint) → force-stop → reopen from **Assessments** and **OpenQuiz** → saved answers and immutable grade on retry → **Quiz Results** shows persisted score (not local recompute).
2. Teacher results: wrong `session_id` / `attemptId` → error, not another student’s row.

Do not upload production documents or modify store signing.
