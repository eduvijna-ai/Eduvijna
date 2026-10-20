# Founder mobile regression — issue & parity ledger (2026-10-18)

**Worktree:** `C:\Users\kanne\dev\Eduvijna-pr26-closure`  
**Branch:** `integration/mobile-founder-acceptance-20261011`  
**Review baseline:** `54fa5fb` (partial recovery; not accepted)  
**Product SHA (review pass):** `b570e91f7823074e55fb6049c42f61a48303f06b`  
**Release APK:** `.stack-validation-logs/founder-acceptance/eduvijna-acceptance-release-b570e91-universal.apk`  
**APK SHA-256:** `00093298cb95c66d1cc15f8ec465d2218bebb33ac4a1305718776e6b551760f1`  
**API origin (mobile/dev):** `https://dev-api.eduvijna.com`  
**Web:** `https://dev.eduvijna.com`  
**Device target:** OPPO CPH1823 `OBAAZLSK5DFIGYZ5` — **authorized and exercised 2026-10-18** (see `FOUNDER_MOBILE_REGRESSION_PHYSICAL_HANDOFF_20261018.md`).  
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
| M-01 | Student | Home open / focus | Request storm + hydrate | List without N× attended-quiz | Removed hydrate; coalesce in-flight; post-submit epoch invalidates 8s focus window | Implemented + unit-tested; Physical Home KPIs observed | PASS (code). Physical Home **PASS** (timing not measured) |
| M-02 | Student | Analytics Completed / Done | Score-first / cohort Done | `student_status \|\| quiz_status`; availability separate | Shared `studentAnalyticsClassification`; Home shows 25 completed | Implemented + unit-tested; Live API; Physical Home KPIs | PASS. Instructor Journey B date-picker still fails |
| M-03 | Student | Classroom labels | Unknown Class | classroom_name | Lookup merge retained | Implemented + unit-tested | PASS when API names present |
| M-04 | Student | Submit / reopen | Persistence unproven | Attempt + submission persist | Fixture **reopen PASS** (60%/6/10) via Assessments + deeplink; fresh submit not run | Physical reopen **PASS**; fresh submit **Not tested** | Reopen proven |
| M-05 | Instructor | Analytics fixture 479 | Journey B date picker | 60% / 6 of 10 | Analytics hub loads; native date set to 2026-08-01 **FAIL** on OPPO A10 | Physical partial | Hub PASS; drill **Blocked** on date picker |
| M-06 | Instructor | Document From Books/Upload | Mathpix / provider / curriculum | Same endpoints as web | Mobile+web share `POST /api/v1/batch-ocr-upload` (empty → 422 files required). Mathpix-config failure needs same-source Network compare on device/web — **not** declared backend-only from empty probe. Curriculum validation preserved. Class IDs preserved via `normalizeSavedBooksClassOptions` | Implemented + unit-tested; Live API endpoint shape verified; full OCR **Blocked** | Class identity PASS. Provider claim pending same-source capture |
| M-07 | Admin | Class Overview | Failure as zeros; 500/200 caps; stale commits | Per-section errors; full pagination; no stale | Physical: KPIs + **Staff directory: 38** note; assignment Teachers=1 | Implemented + unit-tested; Physical **PASS** (Class Overview UI) | PASS physical on OPPO |
| M-08 | Admin/Teacher/Student | Timetable `Pundefined` | Templates tab used `name` fallback → `P${period_number}` | Template name / `P{n}` | **ERP `TimetableScreen` Templates path** fixed (`template_name`); period aliases + `P—`; slot rows guard undefined | Implemented + unit-tested | PASS (code Templates path). Physical **Blocked** |
| M-09 | Instructor | Share modal | Clipped actions | Scroll + footer | Prior `ShareQuizModal` KAV | Implemented (prior commit) | Physical **Blocked** |
| M-10 | All | Push | — | FCM | API send **201** + 1 Android token; **not received** on OPPO | Physical send OK / receipt **FAIL** | OEM/FCM delivery open; tap **Not tested** |
| M-11 | Student Home | Incoming params log | Noise | Harmless | Not a defect | Valid scope | — |
| M-12 | Instructor/Teacher | Camera/gallery page preview cropped | Full page | Full frame unless user crops; EXIF bake; contain preview; OCR uses fileUri | Android PanResponder zoom/pan; layout-bound zoom on preview; MIME-safe normalize; geometry unit tests | Implemented + unit-tested | Code PASS; **manual not verified** |
| M-13 | Instructor/Teacher | Tap image → preview | Full-screen fit + zoom/pan; Back closes; select/remove separate | Same | `FullScreenImagePreview` PanResponder (not iOS-only ScrollView zoom) | Implemented + unit-tested | Code PASS; **manual not verified** |
| M-14 | Instructor Home | Duplicate “Document Quiz / Upload & books” | Single Document entry | Capability dedupe via production `resolveQuizGenerationTiles` | QuizGenerationGrid uses shared helper; production tests | Implemented + unit-tested | Code PASS; **manual not verified** |
| M-15 | Instructor | Handwritten Mathpix 503 | Web parity OCR + generate | Same `POST /batch-ocr-upload` | Live probe **503 Mathpix gate** on `dev-api` (`handwritten-ocr-parity-live.json`). Generation **Blocked** shared backend. User-facing copy cleaned | Live API verified blocker | **Genuinely blocked** until Mathpix enabled server-side |
| M-16 | Student | Pending Notifications “Unknown Class” | Real classroom name | Scoped lookup + retry; prior map on failure; live classes view resolves DEV_* opaque ids | `studentClassroomLookup` + live `pending-classroom-names-live.json` (unresolved=0) | Implemented + unit-tested; Live API | Code+live PASS; **manual not verified** |
| M-17 | Teacher/Instructor | Classes KPI vs list | Same count as ClassesList | Unique `classroom_id` from class_wise; ignore divergent reported total; preserve prior on fetch fail | Live: unique=6, summaryUnique=3, reported=4≠6 (`teacher-classroom-count-live.json`) | Implemented + unit-tested; Live API | Code+live PASS; **manual not verified** |

### Live API notes (sanitized)
- Analytics `student_total_details`: 200, 51 rows; completed=25 (all null score in sample), pending=8, missed=18; expired avail=43 / active=8 (`analytics-classification-live.json`).
- Fixture 479: check-record status 200; attended-quiz 200 with 10 items (`submission-document-live.json`).
- Document: `/api/v1/batch-ocr-upload` reachable (422 missing files on empty body) — matches web path; not Mathpix-config proof.
- Handwritten OCR (2026-10-18 follow-up): instructor `POST /api/v1/batch-ocr-upload` → **503 Mathpix not enabled** on `https://dev-api.eduvijna.com` (shared with web handwritten).
- Pending classroom names: classes view lookupSize=5; DEV_MATRIX/DEV_DOC opaque `class_*` ids resolve (e.g. 4A-Mathematics / 4A-Telugu); unresolvedOpaqueIds=0.
- Teacher classrooms: class_wise unique=6; summary-named unique=3; pagination reportedTotal=4 does **not** match unique — KPI must use unique classroom ids.

### Remaining blockers
1. Journey B native date-picker automation (or alternate date entry) on OPPO Android 10.
2. Push FCM receipt/tap despite API `201` + registered Android token.
3. **Mathpix/provider must be enabled on shared API** before handwritten generation can succeed (mobile+web same gate). Do not mark M-15 fixed without successful generation evidence.
4. Fresh student submit (beyond fixture 479 reopen) + document save/history/reopen.
5. Founder review/acceptance (PR #26 remains DRAFT).
6. M-12…M-17 / M-01…M-11 physical/manual verification on OPPO (focused code checks ≠ release approval).
7. OPPO last known install is **release APK** (`com.eduvijna.app` @ b570e91) — cannot load Metro JS; needs new install of a build that includes this SHA (dev client or rebuilt release). Do not uninstall without authorization.
