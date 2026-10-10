# Phase 1 — assigned quiz API contracts (dev-api)

Verified against **`https://dev-api.eduvijna.com`** via mobile client code paths (PR #18). No production deployment.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/dashboard/attended-quiz` | Load persisted student submission (`student_id`, `session_id`, `quiz_id`) |
| `GET` | `/api/v1/dashboard/quiz-attempts` | List attempts scoped by `quiz_id`, `student_id`, `class_id` (= assignment `session_id`) |
| `POST` | `/api/v1/dashboard/quiz-attempts` | Create attempt (`status: started`) |
| `PUT` | `/api/v1/dashboard/quiz-attempts/:id` | Finalize attempt (`score`, `status: completed`, `completed_at`, `time_spent_seconds`) |
| `POST` | `/api/v1/dashboard/quiz-submissions` | Persist `log_data` + `score` (`classroom_id` = assignment `session_id`) |
| `GET` | `/api/v1/dashboard/teacher-quizzes` | Teacher result fallback (`view_type=all`, `quiz_id`) |

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

Grading is finalized (including optional explanation reconciliation) **before** this payload is written to the immutable checkpoint and POSTed.

## Emulator checks (manual)

With Metro on **8082** and dev client connected to **dev-api**:

1. Complete an assigned quiz attempt — confirm POST `quiz-submissions` includes `log_data.answers` and stable `score`.
2. Force-stop app after attempt PUT but before POST (checkpoint) — reopen; recovery resubmits without duplicate attempt when possible.
3. Open **Quiz Results** for the same `quiz_id` + `session_id` — UI matches persisted score and answers (including score **0**).

Do not upload production documents or modify store signing.
