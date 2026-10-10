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
| `GET` | `/api/v1/dashboard/teacher-quizzes` | Teacher result load (`view_type=all`, `quiz_id`) with strict student/session/attempt matching |

## `log_data` shape (client)

```json
{
  "answers": [
    {
      "questionNumber": 1,
      "question": "...",
      "options": ["..."],
      "correctAnswer": "B",
      "userAnswer": "B",
      "isCorrect": true
    }
  ],
  "questionCount": 1,
  "score": 100,
  "time_spent_seconds": 42,
  "attempt_id": 99,
  "client": { "platform": "eduvijna-mobile" }
}
```

Grading is finalized (including optional explanation reconciliation) **before** the immutable checkpoint is written and POSTed. Retries reuse the checkpoint `log_data`, score, `finalizedAt`, and duration — not live UI state.

## Verification status (sign-off batch)

| Check | Status | Evidence |
|-------|--------|----------|
| Client contract unit/integration tests (`assignedQuizSubmission`, `assignedQuizRecovery.integration`, `quizResultRetrieval`) | **Verified** | Jest run recorded in PR #18 sign-off commit message / CI |
| `npm run config:verify` / `npm run cli:verify` (stack PRs #16–#17) | **Verified** | Same sign-off batch |
| Live dev-api assigned-quiz submit + attended-quiz read on device/emulator | **Pending** | Requires authenticated dev client session; not re-run in this doc-only pass |
| Emulator: force-stop after attempt PUT, reopen recovery (Assessment + OpenQuiz) | **Pending** | Manual; do not restart Founder’s running emulator for doc fixes |
| Emulator: `alreadySubmitted` shows persisted results (not local recompute) | **Pending** | Manual |
| TS/lint vs repository baseline | **Pending** | Compare `.setup-baseline-typecheck.json` / `.setup-baseline-lint.json`; passing Jest alone does not prove zero new diagnostics |

## Manual emulator checks (when running Metro on **8082**)

1. Complete an assigned quiz — confirm POST `quiz-submissions` includes `log_data.answers` and stable `score`.
2. Force-stop after attempt PUT but before POST (checkpoint) — reopen from **Assessments** and **OpenQuiz**; recovery should resume submission using saved answers.
3. Open **Quiz Results** for the same `quiz_id` + `session_id` — UI matches persisted score and answers (including score **0**).
4. Teacher results: wrong `session_id` or `attemptId` must show error/missing, not another student’s attempt.

Do not upload production documents or modify store signing.
