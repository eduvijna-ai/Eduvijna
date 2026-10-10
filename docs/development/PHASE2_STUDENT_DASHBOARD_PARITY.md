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
| Student My Analytics — View Results | Recovery probe + `sessionId` like Assessments | **Done** — `resolveStudentAssignedQuizViewResults` |
| Student Analytics filters / totals | Align with dashboard store scopes | **Deferred** — `StudentAnalyticsScreen` is teacher drill-down (teacher summary API) |
| Duplicate attempt rows in analytics API | May inflate `student_total_details` attempt counts | **Informational** — Home/Assessments use check-record merge (see Phase 1 backend observations) |

## Quiz-React reference

- Web student flows use richer `/dashboard/quizzes` and summary APIs (`UserQuizDashboard.tsx`, `dashboardApi.ts`).
- Mobile uses `POST /api/v1/quiz/check-record` with `p_check_type` `pending` | `completed` — **two pagination totals**, merged client-side (preserve distinct scopes).

## Key files

- `src/core/services/studentDashboardData.service.ts` — merge, dedupe, stats
- `src/core/services/dashboardApi.ts` — `checkRecordToQuiz` classroom/score mapping
- `src/screens/StudentDashboard.tsx` — consumes shared loader
- `src/screens/Assessments.tsx` — student refresh → store update

## Assignment classification (PR #19)

- `src/utils/studentAssignmentClassification.ts` — completion vs availability vs `has_time_limit`
- `checkRecordToQuiz` applies classifier; Assessments Start/Resume use `canStudentStartAssignment` / `canStudentResumeAssignment`
- Completed rows stay in **Completed** after expiry; expired unfinished → **Missed**; future → **Upcoming** (no Start)

## Follow-up (not in this pass)

- Point `StudentAnalyticsScreen` at the same merged quiz set for filter chip counts.
- Founder emulator E2E: verify Home vs Assessments counts with authenticated dev student.
