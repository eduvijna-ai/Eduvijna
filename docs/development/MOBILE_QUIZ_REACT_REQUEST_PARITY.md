# Mobile vs Quiz-React — assigned quiz API parity (dev-api)

Reference web: `Quiz-React` `OpenQuizPage.tsx`, `dashboardApi.ts` (`getAttendedQuiz`).  
Mobile: `assignedQuizSubmission.service.ts`, `assessmentQuizStart.service.ts`, `studentDashboardData.service.ts`.  
API host: **`https://dev-api.eduvijna.com`**. Fixture user: `demo_student` (`userId` **54**), classrooms in `docs/development/e2e-fixtures/live-fixtures.student.json`.

## PR #18 acceptance (mobile only)

- Jest suites for submission, recovery, retrieval, navigation, normalization.
- `npm run bundle:verify:development`.
- Codex review addressed for findings still valid at HEAD.
- Founder emulator E2E (**Metro 8082**) deferred until full phase stack is ready.

Backend deployment, OpenAPI extensions, and eduvijna-api changes are **not** merge prerequisites. See factual backend notes in `PHASE1_ASSIGNED_QUIZ_API.md` § Backend observations.

## Identity and scoping

| Concern | Quiz-React | Mobile (aligned) |
|--------|------------|------------------|
| Authenticated student | `user.id` from auth context | `useAuth().user.id` |
| Assignment session | `searchParams.session_id` | `session_id` on dashboard row / route param |
| Attempt scope | `class_id` query = `session_id` | Same (`quizAttemptApi.listQuizAttempts`) |
| Submission scope | `classroom_id` = `session_id` | Same (`createQuizSubmission`) |
| Persisted answers | `getAttendedQuiz({ student_id, session_id, quiz_id })` | Same (`getAttendedQuiz`) |

## Request ordering (assigned MCQ)

Both clients use the same **supported** sequence:

1. `GET /api/v1/dashboard/quiz-attempts?student_id&quiz_id&class_id` — detect completed / reuse `started`.
2. `POST /api/v1/dashboard/quiz-attempts` — create `started` if needed (localStorage vs AsyncStorage checkpoint).
3. On submit: grade locally → `PUT /api/v1/dashboard/quiz-attempts/{id}` (`completed`, percent score, `time_spent_seconds`).
4. `POST /api/v1/dashboard/quiz-submissions` with `log_data.answers` (+ informational `log_data.attempt_id`, not a top-level API field).

Mobile adds: in-flight guard, immutable checkpoint before PUT, recovery probe via `attended-quiz` before treating submit as done.

## Submission payload (answer encoding)

| Field | Quiz-React | Mobile |
|-------|------------|--------|
| `score` | Percent correct | Percent correct |
| `log_data.answers[]` | `questionNumber`, `question`, `options`, `correctAnswer`, `userAnswer`, `isCorrect` | Same shape (`buildAssignedQuizLogData`); `userAnswer` as letter when possible |
| `log_data.time_spent_seconds` | Yes | Yes |
| `log_data.attempt_id` | Yes (log only) | Yes (log only) |
| `log_data.client` | `{ ua }` | `{ platform: 'eduvijna-mobile' }` |

Grading: both reconcile optional explanation API **before** persistence (mobile: `reconcileResultsWithExplanations` in `QuizTakingScreen` prior to `submitAssignedQuiz`).

## Result retrieval

| Path | Quiz-React | Mobile |
|------|------------|--------|
| Student | `attended-quiz` + merge `log_data.answers` / `items` | `normalizeAttendedQuizResponse` — items authoritative; sparse log merged onto items |
| Teacher | Dashboard attempts JSON | `fetchTeacherQuizzes` + strict student/session/attempt match |
| Navigation | Requires `session_id` in URL | Requires `sessionId` route param (Assessments, Analytics, notifications, Home recent) |

## Dashboard list / counts (Phase 2)

| Concern | Quiz-React student home | Mobile |
|---------|-------------------------|--------|
| List source | User dashboard summary APIs | `POST /api/v1/quiz/check-record` ×2 (`pending`, `completed`) merged client-side |
| Classroom label | API name | `classroom_name` when present (`checkRecordToQuiz`) |
| Dedupe key | Per product rules | `quiz_id` + `session_id` (prefer completed, latest `created_at`) |
| Analytics detail | `student_total_details` view | `QuizStudentMyAnalyticsScreen` — same view type |

Distinct `pending` vs `completed` pagination totals are preserved (do not sum API totals blindly).

## Side-by-side (representative shapes)

### List attempts (before start)

```http
GET /api/v1/dashboard/quiz-attempts?student_id=54&quiz_id={quizId}&class_id={sessionId}
```

### Finalize attempt

```http
PUT /api/v1/dashboard/quiz-attempts/{attemptId}
Content-Type: application/json

{
  "score": 80,
  "status": "completed",
  "completed_at": "2026-10-10T12:00:00.000Z",
  "time_spent_seconds": 120
}
```

### Persist answers

```http
POST /api/v1/dashboard/quiz-submissions
Content-Type: application/json

{
  "quiz_id": 123,
  "student_id": "54",
  "classroom_id": "{sessionId}",
  "score": 80,
  "summary": "Auto-scored client-side",
  "submitted_at": "2026-10-10T12:00:00.000Z",
  "log_data": {
    "answers": [ { "questionNumber": 1, "userAnswer": "B", "isCorrect": true, ... } ],
    "questionCount": 5,
    "time_spent_seconds": 120,
    "attempt_id": 456
  }
}
```

### Load persisted result

```http
GET /api/v1/dashboard/attended-quiz?student_id=54&session_id={sessionId}&quiz_id={quizId}
```

## Live capture (authorized fixture)

Run when `EDUVIJNA_DEV_USERNAME` / `EDUVIJNA_DEV_PASSWORD` are set:

```bash
node scripts/compare-assigned-quiz-dev-api.mjs
```

Writes redacted request/response traces to `docs/development/e2e-fixtures/mobile-quiz-react-parity-traces.json`.  
Until executed: structural parity above is verified by code review + Jest; Founder E2E remains pending.

## Known server semantics (informational)

`POST /quiz-submissions` may insert an additional `quiz_attempts` row on dev-api; mobile cannot prevent that without a backend change. Recovery checkpoints and `findPendingSubmissionCheckpoint` on View Results mitigate partial PUT/POST failures on the client.
