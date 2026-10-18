# Founder mobile regression — issue & parity ledger (2026-10-18)

**Worktree:** `C:\Users\kanne\dev\Eduvijna-pr26-closure`  
**Branch:** `integration/mobile-founder-acceptance-20261011`  
**Baseline HEAD (pre-fix):** `8df956ffc6985e96aadf107832a9cf0e9ee2a051`  
**API origin (mobile/dev):** `https://dev-api.eduvijna.com`  
**Web:** `https://dev.eduvijna.com`  
**Device target:** OPPO CPH1823 `OBAAZLSK5DFIGYZ5` — **not attached during this run** (ADB empty). Physical APK install/verification **BLOCKED** pending device reconnect.  
**Screenshot archives:** extracted under `.stack-validation-logs/founder-screenshot-inventory-20261018/` (all four ZIPs available).

Classification key: Confirmed mobile defect | Valid scope difference | Backend/environment | Not reproduced | Blocked

---

| ID | Role | Screen/action | Observed (screenshots / probes) | Expected (deployed web) | API contract | Root cause | Changed files | Regression check | Evidence / disposition |
|----|------|---------------|----------------------------------|-------------------------|--------------|------------|---------------|------------------|------------------------|
| M-01 | Student | Home open / focus | Long load; request storm risk | List/summary without N× attended-quiz | `POST /api/v1/quiz/check-record` + `GET /dashboard/quizzes?view_type=student_total_details`; detail via attended-quiz only on View Results | List load still called `hydrateCompletedParsedQuizMetrics` (concurrency 4 × up to 5 retries) + mount+focus double fetch | `studentDashboardData.service.ts`, `studentCheckRecordDashboardLoader.ts`, `quizResultRetrieval.service.ts`, `StudentDashboard.tsx` | `studentDashboardLoad.noHydrate.test.ts`, loader tests | **PASS** (unit). Live before/after request counts: Home list no longer invokes attended-quiz. Physical timing **BLOCKED** (no OPPO). |
| M-02 | Student | Analytics Completed / Done | KPI Completed 0 while rows completed; Done wrong when using cohort `completed_count` | Counts from `student_status` / attempt | `GET /api/v1/dashboard/quizzes?view_type=student_total_details` — live probe: 51 rows, 25 `student_status=completed`, `best_score` often null, `completed_count` still present | KPI used scores only; class Done used teacher cohort sum | `quizAnalyticsApi.ts`, `analyticsUiUtils.ts`, `QuizStudentMyAnalyticsScreen.tsx` | `quizAnalyticsApi.studentAggregate.test.ts`, `analyticsUiUtils.studentKpiStatus.test.ts` | **PASS** (unit + API shape). Physical **BLOCKED**. |
| M-03 | Student | Classroom labels | Unknown Class | Human classroom_name | `view_type=classes` lookup + check-record names | Opaque `class_*` when lookup empty | Existing `classroomDisplayName.ts` retained; list path still merges lookup | Covered by noHydrate test classroom_name | **PASS** with lookup; if lookup fails → still Unknown Class (valid when API omits name). |
| M-04 | Student | Submit DEV_MATRIX / generated | Submission Error modal | Persist attempt + submission | attempt update + quiz-submissions | Not fully re-proven this session (API intermittent timeout); prior harness paths remain | No unsafe change to mutation retry | Existing submission tests unchanged | **BLOCKED** — needs OPPO + live submit reopen. Code path left intact. |
| M-05 | Instructor | Analytics → fixture 479→70→207 | Prior Journey B PASS on APK `2fb85b0` | 60% / 6 of 10 | teacher dashboard / attended | Unchanged this session | — | Prior evidence under `engineering-installed-smoke/` | **Not reproduced** this session (device absent). Prior PASS retained as historical. |
| M-06 | Instructor | Document From Books/Upload | Mathpix not configured; provider unavailable; curriculum verify failed | Same routes as web; clean error exit | Web: `batch-ocr-upload`, `quiz/generate-strict`, `assessment/generate-multimodal`, `study-materials/generate-from-book` | Mathpix/provider messages are **backend config**; mobile has no Mathpix keys. Curriculum verification errors preserved. Duplicate grades: label aliases | `savedBooksContent.service.ts` dedupe; share modal layout | `dedupeSavedBooksClassesByGrade.test.ts` | **Backend/environment** for Mathpix/provider (**owner:** enable MATHPIX_* / provider on `dev-api`). Duplicate class labels **PASS** (code). Live generation **BLOCKED** (device + avoid flooding). |
| M-07 | Admin/Instructor | Class Overview Students | KPI Students 6 vs list 168; Student #16; Teachers 0 vs 38 staff | Web: students-by-user for roster; KPI from distinct profiles; Teachers KPI = distinct teacher_id on assignments; Staff tab = `/erp/hr/staff` | Was using `studentProfilesApi` + KPI sum of class `student_count` | Wrong list API + wrong KPI source + weak name fields | `erp/screens/ClassOverviewScreen.tsx`, `erp/utils/personDisplayName.ts`, `mappers/teacher.ts`, `useTeacherData.ts` roster scope | `personDisplayName.test.ts` | **PASS** (code). Live ERP with year scope partially probed (staff 38 named). Full UI **BLOCKED** (no device). Teachers KPI vs Staff list count is **valid scope difference** (assignment teachers vs HR directory). |
| M-08 | Teacher/Student | Timetable | `Pundefined` | `P{n}` | period_number / periodNumber / period_no | Student/staff mappers missed aliases | `useStudentTimetable.ts`, `StaffSelfServiceView.tsx`, timetable screens | — | **PASS** (code). Physical **BLOCKED**. |
| M-09 | Instructor | Share modal | Clipped fields/actions | Scroll + footer reachable | UI only | Nested scroll / keyboard / maxHeight | `ShareQuizModal.tsx` | — | **PASS** (code). Physical **BLOCKED**. |
| M-10 | All | Push delivery/tap | Prior BLOCKED | FCM on device | — | No active device token / OEM | — | — | **BLOCKED** (device + FCM). |
| M-11 | Student Home | Incoming params undefined log | Log noise | Harmless | — | Route params optional | Not a defect | — | **Valid** / not a defect. |

### Web/mobile contract notes (sanitized)
- Login: `POST /api/v1/auth/login` body `{ username_or_email, password, remember_me, device_info }` → `dev-api.eduvijna.com`
- Student lists: `POST /api/v1/quiz/check-record` `{ p_student_id, p_session_id, p_check_type }` → 200, pending rows observed (26)
- Student analytics: `GET /api/v1/dashboard/quizzes?view_type=student_total_details` → 200, 51 rows / ~121ms (probe)
- Staff directory: `GET /api/v1/erp/hr/staff` → 200, 38 named staff
- ERP class/students require `school_id` + `academic_year_id` (`/api/v1/erp/academic/academic-years`)

### Request amplification before/after
| Path | Before | After |
|------|--------|-------|
| Student Home list | check-record + classroom lookup + student_total_details + **hydrate N× attended-quiz (≤5 retries)** + focus refetch | Same three list calls; **no hydrate**; focus deduped ≤8s / in-flight coalesced |

### Remaining blockers
1. Connect OPPO `OBAAZLSK5DFIGYZ5`, install new release APK (preserve data), run consolidated physical suite.
2. Backend owner: Mathpix (`MATHPIX_API_KEY`, `MATHPIX_APP_ID`, `ENABLE_MATHPIX`) and assessment provider availability on `dev-api`.
3. Live submission reopen + document generate save/history on device after provider health confirmed.
4. Push delivery/tap on physical device after student push registration.
