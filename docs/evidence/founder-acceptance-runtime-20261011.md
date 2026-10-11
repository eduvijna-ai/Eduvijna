# Founder acceptance — engineering verification (2026-10-11)

**Branch:** `integration/mobile-founder-acceptance-20261011` (PR #26)  
**HEAD:** see `docs/evidence/meta.json` after latest push.

## Login (normal form, no acceptance file)

| Check | Android emulator | Expo web |
|--------|------------------|----------|
| Acceptance `acceptance-login.json` / `ACCEPTANCE_ADB_LOGIN` | **Removed** | N/A |
| Focus + `onChangeText` (length-only `LOGIN_DIAG`) | **PASS** (email 12, password 8) | **BLOCKED** (login DOM not reached in Puppeteer @ 8083/8084) |
| Submit → in-app login API | **PASS** (`login_result` ok) | Not verified this push |
| Instructor / student shell | **PASS** (`android-login.mjs`) | Not verified this push |

Sanitized: `docs/evidence/login-milestones-sanitized-instructor.json`. Raw UI XML under `.dev-api-document-workflow-run/` (gitignored).

## Auth policy (`authLifecycle` + coordinator)

| Case | Result |
|------|--------|
| Profile 403 | Transient; credentials retained (`authLifecycle.policy` + `useAuth.lifecycle`) |
| Refresh 401 | Credential rejection |
| Refresh/profile timeout | Cache restore |
| Permission 403 on ordinary API | No logout (`apiClientAuthInterceptor`) |
| Refresh 403 | Transient (coordinator) |

## Founder journeys (quiz 479 / student 70 / attempt 207)

| Journey | Status | Notes |
|---------|--------|-------|
| A (Assessments → students → result) | **FAIL** (intermittent) | `fixture_students_control_missing` when Expired list scroll misses control; StudentList header now includes `classroomName` |
| B (Analytics → result) | **FAIL** | Journey script updated for class-first Analytics navigation; re-run after bundle reload |

## Product requirements (remaining)

| Area | Status |
|------|--------|
| Books alignment OFF/ON, history, completions | Not re-verified this push |
| Rich educational content surfaces | Not re-verified this push |
| API-assigned modules / deep links | Not re-verified this push |
| Option identity through review | Not re-verified this push |

## Automated regression (this diff)

- `authLifecycle.policy` + `useAuth.lifecycle` + `assessmentsTeacherStudentList.navigation` — pass  
- `android-login.mjs` instructor + student — pass @ engineering HEAD (post-fix)
