# Phase 2 — student dashboard / list parity (Quiz-React reference)

Branch: `feat/mobile-phase2-student-dashboard-parity` (stacked after PR #18).

## Scope

| Area | Intent | Status |
|------|--------|--------|
| Classroom display names | Use API `classroom_name` when present; avoid showing raw `classid` | **Done** — `checkRecordToQuiz` + `studentDashboardData.service` |
| Home statistics | Count pending + completed from distinct check-record scopes | **Done** — parallel `pending` + `completed` fetch |
| Assessments list | Same merged dataset via dashboard store | **Done** — shared `loadStudentDashboardQuizzes` |
| Pull-to-refresh on Assessments (student) | Refetch store | **Done** |
| Recent completed on Home | Sort by `completed_at` | **Existing** — relies on completed fetch |
| Student Analytics filters / totals | Align with dashboard store scopes | **Partial** — still uses `fetchTeacherDashboardSummary`; audit follow-up |
| Submission-dependent counts (duplicate attempts) | Single attempt per submit | **Blocked** — backend explicit `attempt_id` contract (see `PHASE1_ASSIGNED_QUIZ_API.md`) |

## Quiz-React reference

- Web student flows use richer `/dashboard/quizzes` and summary APIs (`UserQuizDashboard.tsx`, `dashboardApi.ts`).
- Mobile uses `POST /api/v1/quiz/check-record` with `p_check_type` `pending` | `completed` — **two pagination totals**, merged client-side (preserve distinct scopes).

## Key files

- `src/core/services/studentDashboardData.service.ts` — merge, dedupe, stats
- `src/core/services/dashboardApi.ts` — `checkRecordToQuiz` classroom/score mapping
- `src/screens/StudentDashboard.tsx` — consumes shared loader
- `src/screens/Assessments.tsx` — student refresh → store update

## Follow-up (not in this pass)

- Point `StudentAnalyticsScreen` at the same merged quiz set for filter chip counts.
- Founder emulator E2E: verify Home vs Assessments counts with authenticated dev student.
