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

## Backend inspection — `create_quiz_submission` (eduvijna-api)

**Reference commit (requested):** `7229a15941b63f4b8e80f8a94fa9f61480b78c36` (`main` at 2026-10-10; merge PR #394 captcha hotfix only — no diff in this method vs dev pin below).

### Configured deployment identity (infra pin)

| Source | Identity | Notes |
|--------|----------|--------|
| `Eduvijna-Cloud-Infra-Deploy` `helm/environments/dev/eduvijna-api.values.yaml` | Image tag `dev-67b5a3745ac00302a6fe862a839530c11b5a3a46`, digest `sha256:f24bd8eca143ccd155f46cd9104c8a0295a5e79869afd3c593b7eb5128ea143c` | **Authoritative configured dev pin** (2026-10-07, merge PR #389). Registry digest is deployment identity; tag is provenance metadata. |
| Git compare | `create_quiz_submission` at `67b5a374` vs inspected `7229a159` | **Identical** — captcha hotfix on `main` does not change submission path |

### Live verification (runtime — not assumed equal to pin)

| Source | Identity | Notes |
|--------|----------|--------|
| `GET https://dev-api.eduvijna.com/health` | `version: "2.0.0"`, `environment: "development"` | **No git SHA**; `/version` → 404 |
| OpenAPI | `QuizSubmissionCreateRequest` without `attempt_id` | Matches code at configured pin; **live SHA not proven** without deploy audit |
| Authorized before/after `quiz-attempts` around one `POST /quiz-submissions` | **Pending** | Requires student token; blocks PR #18 merge on semantics only |

### Controller (`v1_dashboard_controller.py`)

- `POST /api/v1/dashboard/quiz-submissions` → `service.create_quiz_submission(user_id, request)`.
- RBAC: `student` or `instructor`; students have `request.student_id` forced to JWT `user_id`.
- Rate limit: `create_quiz_submission`.
- **No** validation of `classroom_id` vs enrollment, quiz assignment, or an in-flight `quiz_attempts` row.

### Service (`create_quiz_submission`)

1. `_prepare_worksheet_submission` — server-side worksheet scoring when `log_data.worksheet_answers` present (preserves worksheet + analytics path).
2. `class_id = await dal.get_classroom_id_by_quiz_id(quiz_id)` — **client `classroom_id` / assignment `session_id` is not used** when building the persisted submission row.
3. Loads **all** attempts for `(student_id, quiz_id, class_id)`; sets `attempt_number = max(existing) + 1` (or `1`).
4. Inserts `quiz_submissions` via PostgREST (`postgrest_quiz_dal.create_quiz_submission`).
5. **Always tries to insert a new `quiz_attempts` row** with `status: completed` and that computed `attempt_number` (duplicate key → log warning, submission still succeeds).
6. Does **not** read `log_data.attempt_id`, does **not** update the row created by `POST`/`PUT /quiz-attempts`.

### Contrast: `create_quiz_attempt` (start)

- Rejects new start when a **completed** or **started/in_progress** attempt already exists for `(student_id, quiz_id)`.
- Client flow (Quiz-React `OpenQuizPage.tsx`, mobile `assignedQuizSubmission.service.ts`): **PUT** finalize existing attempt, then **POST** submission with answers in `log_data` (including informational `attempt_id` in log only).

### Observed semantic gap (why PR #18 stays blocked)

| Client expectation | dev-api (`67b5a374` / `7229a159`) |
|--------------------|-----------------------------------|
| One attempt row: `started` → `completed` on submit | POST submission may add a **second** `completed` attempt (or bump `attempt_number` and insert again) |
| Answers attached to the attempt being finalized | Answers only on `quiz_submissions.log_data`; PUT attempt has no `log_data` |
| Idempotent retry after PUT+POST partial failure | Each successful POST creates a **new** submission; attempt side-effect is non-idempotent |
| Assignment scoped by `classroom_id` / `session_id` | Submission `classroom_id` derived from quiz lookup, not validated against request |

**Out of scope for mobile workarounds:** reordering PUT/POST, omitting POST, deleting duplicate attempts, or dropping answer persistence.

## Proposed backend change (eduvijna-api — proposal only; no implementation/deploy)

**Goal:** Atomically persist `quiz_submissions` and finalize the **selected** `quiz_attempts` row when clients use the explicit-attempt path, while keeping legacy POST behavior for worksheets and old clients.

### 1. Contract (OpenAPI)

`QuizSubmissionCreateRequest` (backward compatible):

| Field | Type | Semantics |
|-------|------|-----------|
| `attempt_id` | `integer`, **optional** | **Omitted** → legacy path (worksheet / old clients): current behavior with documented limitations. **Present** → explicit-attempt path: must reference an existing attempt owned by the student for this assignment. |
| `classroom_id` | `string`, required | Assignment `session_id`; must match attempt `class_id`, enrollment, and active quiz assignment for `(classroom_id, quiz_id)`. |
| `idempotency_key` | `string`, optional | Stable per submit tap; replay returns same submission. |

`QuizSubmissionResponse` additions: `attempt_id`, `already_submitted` (boolean).

**Explicit-attempt path (single transaction):**

1. AuthN student; `student_id` from token (existing controller behavior).
2. Validate quiz, enrollment, assignment, and `classroom_id` ↔ attempt `class_id`.
3. Load attempt; reject wrong owner / quiz / class; allow `completed` only on idempotent replay.
4. `_prepare_worksheet_submission` when `log_data.worksheet_answers` present (unchanged).
5. Insert submission (or upsert on idempotency key).
6. Update **that** attempt (`completed`, score, times) — **no** extra `create_quiz_attempt`.
7. On unique violation (`attempt_id` or `idempotency_key`), return existing row + `already_submitted: true`.

**Legacy path (`attempt_id` absent):** preserve today’s worksheet + Quiz-React compatibility; document that duplicate completed attempts may still occur until clients send `attempt_id`.

### 2. Files to change (eduvijna-api)

| File | Change |
|------|--------|
| `app/schemas/v1_dashboard/schemas.py` | Optional `attempt_id`, `idempotency_key`; response fields |
| `app/api/v1_dashboard/v1_dashboard_controller.py` | Map validation to 400/404/409; no swallow to 500 |
| `app/services/v1_dashboard/v1_dashboard_service.py` | Branch explicit vs legacy; remove unconditional post-submit `create_quiz_attempt` on explicit path; use `request.classroom_id` for assignment validation |
| `app/dal/postgrest_quiz_dal.py` | Attempt update + submission insert helpers |
| `app/dal/v1_dashboard_dal_postgrest.py` | Delegate transactional RPC if added |
| `migrations/0XX_quiz_submission_attempt_idempotency.sql` | Unique indexes (see below) |
| `sql_scripts/` or Supabase RPC | `edu.finalize_quiz_submission(...)` wrapping INSERT+UPDATE |
| `tests/v1_dashboard/test_v1_dashboard_comprehensive.py` | Explicit path, idempotent replay, legacy worksheet POST |
| New: `tests/v1_dashboard/test_quiz_submission_finalize.py` | Enrollment/assignment rejection, wrong `attempt_id` |

### 3. Migration / RPC

- `UNIQUE (attempt_id)` on `quiz_submissions` where `attempt_id IS NOT NULL` (or junction table if submissions stay attempt-agnostic today).
- `UNIQUE (student_id, idempotency_key)` where key present.
- RPC `finalize_quiz_submission` (PostgREST exposed): single transaction, `RAISE` on constraint → API maps to 409 + `already_submitted`.

### 4. Rollback

- Deploy previous image tag/digest from `eduvijna-api.values.yaml` history.
- Migration rollback: drop new indexes/RPC only if no rows depend on `attempt_id` column (additive column nullable → safe to leave).

### 5. Client compatibility

| Client | Change after backend |
|--------|---------------------|
| Quiz-React `OpenQuizPage.tsx` | Add top-level `attempt_id` on POST (already in `log_data`); keep PUT→POST |
| Eduvijna mobile | Same; blocked until dev-api ships |
| Worksheet `OpenWorksheetPage.tsx` | No `attempt_id`; legacy path + `_prepare_worksheet_submission` |

### 6. Mobile dependency (PR #18)

| Item | Status |
|------|--------|
| Recovery probe on Start/Resume **and** completed-card View Results | **Done** (this branch) |
| Immutable recovery: read-only answers + explicit retry save | **Done** |
| Checkpoint cleanup best-effort after server persistence | **Done** |
| Top-level `attempt_id` on POST | **Blocked** until backend explicit path on dev-api |
| Live before/after `quiz-attempts` fixture | **Pending** (Founder E2E deferred) |

**Merge rule:** PR #18 mobile UX may merge when review passes; **submission semantics sign-off** remains blocked until backend + live fixture.

### Related endpoints (unchanged)

| `GET` | `/api/v1/quiz?session_id=…` | Full assigned quiz payload before start/recovery |
| `GET` | `/api/v1/dashboard/teacher-quizzes` | Teacher result load with strict student/session/attempt matching |

## Verification status (2026-10-10 execution)

| Check | Status | Evidence |
|-------|--------|----------|
| Jest: submission, recovery integration, retrieval, navigation, `QuizTakingScreen` recovery, normalization | **Verified** | Assigned-quiz + results suites including sparse-log / unanswered / score-0 cases |
| Jest: recovery catch + View Results probe + immutable retry + checkpoint cleanup | **Verified** (2026-10-10) | `assessmentsAssignedQuizStart`, `assessmentsAssignedQuizViewResults`, `assignedQuizRecovery`, `assignedQuizSubmission`, `QuizTakingScreen.submissionRecovery` |
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
