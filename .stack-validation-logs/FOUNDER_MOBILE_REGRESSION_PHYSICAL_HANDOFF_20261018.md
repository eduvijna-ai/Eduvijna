# Founder mobile regression — physical suite handoff (2026-10-18)

**PR #26:** DRAFT — pending review/acceptance  
**Device:** OPPO CPH1823 `OBAAZLSK5DFIGYZ5` (authorized `device`)  
**Product APK SHA:** `b570e91f7823074e55fb6049c42f61a48303f06b`  
**APK SHA-256:** `00093298cb95c66d1cc15f8ec465d2218bebb33ac4a1305718776e6b551760f1` (verified pre-install)  
**API:** `https://dev-api.eduvijna.com` (bundle embeds `dev-api`; login with designated fixtures succeeded)  
**Harness tip (this physical pass):** commit after harness a11y fixes (see git log)  
**Version:** `1.0.0` / `versionCode=1`

## Install
- App was **not previously installed** → fresh `adb install -r` (no prior app data to preserve).
- Install Success; `package:/data/app/com.eduvijna.app-…/base.apk`.

## Per-issue / suite results

| Area | Result | Evidence tier | Notes |
|------|--------|---------------|-------|
| Device bind | **PASS** | Physical | Serial authorized; exclusive OPPO |
| APK checksum | **PASS** | Physical | Matches expected SHA-256 |
| dev-api target | **PASS** | Bundle + live login | Fixture logins hit `dev-api` |
| Student Home KPIs | **PASS** | Physical | 51 quizzes / 25 completed / 13 pending / 77% avg |
| Student Assessments → Completed → Results reopen | **PASS** | Physical | Fixture 479: **60%**, **6/10**; `student-fixture-ui-2026-10-18T09-23-02` |
| Deep-link signed-out → login → results | **PASS** | Physical | `has479/has207/has70`, Quiz Results; `deeplink-signed-out-probe-2026-10-18T09-06-50` |
| Fresh submit (new attempt) | **Not tested** | — | Reopen of existing fixture proven; new submit not exercised this pass |
| Instructor login / logout | **PASS** | Physical | Maestro instructor + logout-session smoke |
| Instructor Journey B (date picker → fixture analytics) | **FAIL (harness/OEM)** | Physical | Analytics hub loads; native date picker set to 2026-08-01 failed on Android 10 |
| Instructor Analytics dashboard | **PASS** | Physical | “Analytics Dashboard”, class cards, Done/Pending KPIs |
| ERP School + Class Overview | **PASS** | Physical | Classes/Students/Teachers KPIs; **Staff directory: 38** note shown; assignment Teachers KPI=1 |
| Document / Mathpix same-source | **Partial** | Live API | Mobile/web share `POST /api/v1/batch-ocr-upload` (422 missing files on empty). **No** successful web Network + failing mobile pair captured this pass |
| Document save/history/reopen UI | **Not tested** | Blocked | Needs generation success path |
| Push send | **API PASS / device FAIL** | Physical | `201` send, 1 active Android token; **not received** on device (`physical-push-…09-18-50`) |
| Push tap → destination | **Not tested** | Blocked | Depends on receipt |
| Focused unit tests | **PASS** | Unit | 17/17 classification/ERP/dashboard regressions |

## Harness fixes applied during physical pass (no APK rebuild)
- Tab `content-desc` suffix match for icon-prefixed labels (`, Assessments`).
- Always tap `Completed (N)` chip; Load More by visible text; search + alternate title + direct Results tap for fixture reopen.

## Matrix disposition
Prior aggregate remains **`diagnostic_regression`**. PR26 physical acceptance slice for **reopen + Home + ERP Class Overview + logout/deeplink** is evidenced; Journey B date-picker and push delivery remain open. **Do not treat as full release approval.**

## Precise remaining blockers
1. Journey B native date-picker automation on OPPO Android 10 (or alternate date entry path) to finish instructor fixture analytics drill.
2. Push: FCM delivery/OEM notification receipt on CPH1823 despite API `201` + registered token.
3. Same-source Mathpix/provider: capture successful **dev-web** request + failing **mobile** request for identical source/mode before backend-config declaration.
4. Fresh student submit → persist → reopen (beyond existing fixture 479).
5. Document generate → save → history → reopen on device after provider path is healthy.
6. Founder review/acceptance to leave DRAFT.

## Key evidence paths
- Install: `engineering-installed-smoke/physical-install-OBAAZLSK-2026-10-18T14-16-05/`
- Student results reopen: `…/student-fixture-ui-2026-10-18T09-23-02/`
- Deeplink reopen: `…/deeplink-signed-out-probe-2026-10-18T09-06-50/`
- Instructor analytics/ERP: `…/physical-erp-analytics-manual-b570e91/`
- Push: `…/physical-push-OBAAZLSK-2026-10-18T09-18-50/`
- API probes: `review-api-probes-20261018/`
