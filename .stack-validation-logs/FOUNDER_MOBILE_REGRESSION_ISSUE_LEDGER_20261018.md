# Founder mobile regression — issue & parity ledger (2026-10-18)

**Worktree:** `C:\Users\kanne\dev\Eduvijna-pr26-closure`  
**Branch:** `integration/mobile-founder-acceptance-20261011`  
**Review baseline:** `54fa5fb` (partial recovery; not accepted)  
**Product SHA (review pass):** `b570e91f7823074e55fb6049c42f61a48303f06b`  
**Release APK:** `.stack-validation-logs/founder-acceptance/eduvijna-acceptance-release-b570e91-universal.apk`  
**APK SHA-256:** `00093298cb95c66d1cc15f8ec465d2218bebb33ac4a1305718776e6b551760f1`  
**API origin (mobile/dev):** `https://dev-api.eduvijna.com`  
**Web:** `https://dev.eduvijna.com`  
**Device target:** OPPO CPH1823 `OBAAZLSK5DFIGYZ5` — reconnect required for physical install/suite.  
**Screenshot archives:** `.stack-validation-logs/founder-screenshot-inventory-20261018/`

### Evidence tiers (do not conflate)
| Tier | Meaning |
|------|---------|
| **Implemented + unit-tested** | Code landed; focused Jest green |
| **Live API verified** | Probe against `dev-api` (redacted evidence under `review-api-probes-20261018/`) |
| **Physical-device verified** | Installed release APK exercised on OPPO |
| **Blocked / not tested** | Prerequisite missing; **not** labeled “not reproduced” |

---

| ID | Role | Screen/action | Observed | Expected (web) | Root cause / fix | Evidence tier | Disposition |
|----|------|---------------|----------|----------------|------------------|---------------|-------------|
| M-01 | Student | Home open / focus | Request storm + hydrate | List without N× attended-quiz | Removed hydrate; coalesce in-flight; post-submit epoch invalidates 8s focus window | Implemented + unit-tested | PASS (code). Physical timing **Blocked** |
| M-02 | Student | Analytics Completed / Done | Score-first / cohort Done | `student_status \|\| quiz_status`; availability separate | Shared `studentAnalyticsClassification` wired to KPI/chips/rows/API aggregate | Implemented + unit-tested; Live API verified (51 rows: 25 completed null score; 25 completed+expired) | PASS (code+API). Physical **Blocked** |
| M-03 | Student | Classroom labels | Unknown Class | classroom_name | Lookup merge retained | Implemented + unit-tested | PASS when API names present |
| M-04 | Student | Submit / reopen | Persistence unproven | Attempt + submission persist | Fixture attended-quiz **200** / 10 items / attempt present; live submit+reopen **Blocked** (no OPPO) | Live API verified (read-back only); submit **Blocked** | Fixture read-back OK; submit/reopen **Blocked** |
| M-05 | Instructor | Analytics fixture 479 | Prior Journey B | 60% / 6 of 10 | Unchanged this pass | Physical **Blocked** this session | Prior PASS historical only — **not** re-run |
| M-06 | Instructor | Document From Books/Upload | Mathpix / provider / curriculum | Same endpoints as web | Mobile+web share `POST /api/v1/batch-ocr-upload` (empty → 422 files required). Mathpix-config failure needs same-source Network compare on device/web — **not** declared backend-only from empty probe. Curriculum validation preserved. Class IDs preserved via `normalizeSavedBooksClassOptions` | Implemented + unit-tested; Live API endpoint shape verified; full OCR **Blocked** | Class identity PASS. Provider claim pending same-source capture |
| M-07 | Admin | Class Overview | Failure as zeros; 500/200 caps; stale commits | Per-section errors; full pagination; no stale | `ClassOverviewScreen` section error/retry, `fetchAllPages`, `loadGenRef`; teacher roster never broadens on empty/fail assignments | Implemented + unit-tested (helpers); Live ERP partial historically | PASS (code). Full UI **Blocked** |
| M-08 | Admin/Teacher/Student | Timetable `Pundefined` | Templates tab used `name` fallback → `P${period_number}` | Template name / `P{n}` | **ERP `TimetableScreen` Templates path** fixed (`template_name`); period aliases + `P—`; slot rows guard undefined | Implemented + unit-tested | PASS (code Templates path). Physical **Blocked** |
| M-09 | Instructor | Share modal | Clipped actions | Scroll + footer | Prior `ShareQuizModal` KAV | Implemented (prior commit) | Physical **Blocked** |
| M-10 | All | Push | — | FCM | Device token | **Blocked** | — |
| M-11 | Student Home | Incoming params log | Noise | Harmless | Not a defect | Valid scope | — |

### Live API notes (sanitized)
- Analytics `student_total_details`: 200, 51 rows; completed=25 (all null score in sample), pending=8, missed=18; expired avail=43 / active=8 (`analytics-classification-live.json`).
- Fixture 479: check-record status 200; attended-quiz 200 with 10 items (`submission-document-live.json`).
- Document: `/api/v1/batch-ocr-upload` reachable (422 missing files on empty body) — matches web path; not Mathpix-config proof.

### Remaining blockers
1. Connect OPPO `OBAAZLSK5DFIGYZ5`, install new release APK (preserve data), run consolidated physical suite.
2. Same-source Mathpix/provider Network capture (successful web + failing mobile) before backend-config declaration.
3. Live submit + reopen + document save/history on device.
4. Push delivery/tap after registration.
