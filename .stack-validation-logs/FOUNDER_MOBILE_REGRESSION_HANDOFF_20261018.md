# Founder mobile regression recovery — final handoff (2026-10-18)

## Verdict
Product fixes for student request amplification, student analytics Completed/Done mapping, ERP Class Overview data source/name/KPI parity, timetable `Pundefined`, share-modal reachability, and saved-books class dedupe are implemented and unit-tested on branch `integration/mobile-founder-acceptance-20261011`. **Physical OPPO verification and a new release APK are BLOCKED** because ADB showed no device `OBAAZLSK5DFIGYZ5` during this run. **PR #26 remains DRAFT.** Do not treat Journey A/B or unit tests alone as full acceptance.

## Identity
| Item | Value |
|------|--------|
| Worktree | `C:\Users\kanne\dev\Eduvijna-pr26-closure` |
| Branch | `integration/mobile-founder-acceptance-20261011` |
| Pre-fix HEAD | `8df956ffc6985e96aadf107832a9cf0e9ee2a051` |
| API | `https://dev-api.eduvijna.com` |
| Web | `https://dev.eduvijna.com` |
| Last installed APK (historical) | `2fb85b0` SHA-256 `F37F33F24C41E613AE5A6E94769DD22EBBF8360DB18087815DC52C5F8479D6BE` |
| New APK this session | **Not built** — blocked on device reconnect + release assemble after push |
| Primary Eduvijna / Quiz-React | Untouched |

## Issue dispositions (summary)
See full ledger: `.stack-validation-logs/FOUNDER_MOBILE_REGRESSION_ISSUE_LEDGER_20261018.md`

| ID | Disposition |
|----|-------------|
| M-01 Student Home amplification | **PASS** (code + unit). Physical timing blocked. |
| M-02 Analytics Completed 0 / Done | **PASS** (code + unit + live API shape: `student_status` with null scores). |
| M-03 Unknown Class | **PASS** with lookup; opaque id fallback unchanged. |
| M-04 Submission persist | **BLOCKED** — needs OPPO + live submit/reopen. |
| M-05 Instructor fixture 479 | **Not reproduced** this session; prior Journey B PASS @ `2fb85b0` retained historically. |
| M-06 Document gen / Mathpix | **Backend/environment** (owner enable Mathpix/provider). Class dedupe **PASS**. Live gen blocked. |
| M-07 ERP Class Overview 6 vs 168 / Student #N / Teachers 0 vs 38 | **PASS** (code): students-by-user + web KPI formula; Staff list 38 named via `/erp/hr/staff`. Teachers KPI vs staff directory = **valid scope**. |
| M-08 Timetable Pundefined | **PASS** (code). |
| M-09 Share modal layout | **PASS** (code). |
| M-10 Push | **BLOCKED** (device/FCM). |
| M-11 Params undefined log | Not a defect. |

## Proven root causes & fixes
1. **Home hydrate storm** — removed attended-quiz enrichment from default list load; focus/mount dedupe + in-flight coalesce; bounded hydrate retries when explicitly enabled.
2. **Student Done/Completed** — `student_total_details` carries `student_status` and often null scores; KPI and class aggregation now use `student_status`, not cohort `completed_count` alone.
3. **ERP Class Overview** — list used `studentProfilesApi` (ids without names) while KPI summed class `student_count`; now students-by-user + distinct-profile KPI; staff names from HR fields.
4. **Pundefined** — student/staff timetable mappers now accept `periodNumber`/`period_no` aliases.
5. **Duplicate Class N** — `dedupeSavedBooksClassesByGrade` on saved-books class dropdown.

## Web/mobile API comparison (sanitized)
| Action | Contract | Probe |
|--------|----------|-------|
| Login | `POST /api/v1/auth/login` `{username_or_email,password,…}` | OK student 70 / instructor 66 |
| Check-record | `POST /api/v1/quiz/check-record` `{p_student_id,p_session_id,p_check_type}` | 200, 26 pending rows |
| Student analytics | `GET /dashboard/quizzes?view_type=student_total_details` | 200, 51 rows, ~121ms; 25 completed by status |
| Staff | `GET /api/v1/erp/hr/staff` | 200, 38 named |
| Wrong origin | `eduapi.eduvijna.com` + `{username,password}` | 422 — not the mobile/dev contract |

## Before/after request counts
| | Before | After |
|--|--------|-------|
| Student Home | 3 list APIs + **N× attended-quiz (≤5 retries each)** + focus refetch | 3 list APIs only; focus skipped if &lt;8s / coalesced |

## Tests & matrix
- New/updated unit: studentDashboardLoad.noHydrate, quizAnalytics student aggregate, student KPI status, personDisplayName, dedupeSavedBooksClasses — **PASS**
- `npm run test:journey-logic` — **28/28 PASS**
- Full-stack matrix — **not re-run** this session (prior disposition: PR26 diagnostic / not full PASS). Do not cite PR26-only as full-stack PASS.

## Physical device
- ADB `devices` empty throughout session → all Maestro/ADB steps **BLOCKED**
- Next action: attach OPPO `OBAAZLSK5DFIGYZ5`, `. .\scripts\engineering-physical-device-env.ps1`, build+install new release APK (preserve data), run consolidated physical suite (student submit/reopen, instructor drill, document modes, ERP, logout/deeplink/bell, controlled failure navigation).

## Screenshots
Extracted: `.stack-validation-logs/founder-screenshot-inventory-20261018/` from the four WhatsApp ZIPs.

## Remaining owner actions
1. Reconnect OPPO; authorize new APK install if destructive clear needed.
2. Backend: configure Mathpix / assessment provider on `dev-api` (do not embed secrets in mobile).
3. After APK: live submission + document save/history + push registration.
4. Keep PR #26 **DRAFT** until acceptance gates complete.
