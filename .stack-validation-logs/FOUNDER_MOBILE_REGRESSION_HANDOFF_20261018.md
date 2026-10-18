# Founder mobile regression — final handoff (review correction pass)

**PR:** #26 DRAFT — recovery not accepted  
**Branch:** `integration/mobile-founder-acceptance-20261011`  
**Review baseline:** `54fa5fb`  
**Product SHA (this pass):** `b570e91f7823074e55fb6049c42f61a48303f06b`  
**API:** `https://dev-api.eduvijna.com` · **Web:** `https://dev.eduvijna.com`  
**Device:** OPPO `OBAAZLSK5DFIGYZ5` — **not attached** (ADB empty). Founder: connect + unlock + approve prompts only.

## Corrections landed (from `54fa5fb`)

| # | Item | Result |
|---|------|--------|
| 1 | Analytics status-first shared contract | `studentAnalyticsClassification` → KPI/chips/rows/API. Live: 51 rows, 25 completed null-score, completed+expired present. |
| 2 | Saved-books class identity | Distinct IDs kept; label collisions → `Class N (#id)`. |
| 3 | ERP Class Overview | Per-section error/retry; full pagination; stale `loadGenRef`; KPI `—` on error; teacher roster never broadens. |
| 4 | Dashboard coordination | Identical in-flight coalesced; post-submit list epoch invalidates 8s focus window. |
| 5 | Submission / document / Pundefined | Fixture 479 attended-quiz **200**/10 items. `/api/v1/batch-ocr-upload` shared with web (empty→422 files). Mathpix-config needs same-source Network pair — **not** declared backend-only. **Pundefined** fixed on ERP **Timetable Templates** (`template_name`, not student SlotRow alone). |
| 6 | Isolated APK | Built at `C:\ev-rc` @ `b570e91` (android retained; no destructive prebuild on primary). |
| 7 | Tests / push / ledger | Focused Jest **17/17**; commit+push `b570e91`; ledger tiers below. |

## APK identity

| Field | Value |
|-------|-------|
| Product / implementation SHA | `b570e91f7823074e55fb6049c42f61a48303f06b` |
| API environment | `EDUVIJNA_API_ENV=development` → `https://dev-api.eduvijna.com` |
| Version | `1.0.0` (`app.json` / `runtimeVersion`) |
| Build root | `C:\ev-rc` (detached `b570e91`) |
| APK | `.stack-validation-logs/founder-acceptance/eduvijna-acceptance-release-b570e91-universal.apk` |
| Size | 113,313,192 bytes |
| SHA-256 | `00093298cb95c66d1cc15f8ec465d2218bebb33ac4a1305718776e6b551760f1` |
| Bundle embed verify | `implementationShaFoundInBundle: true` (`embedded-bundle-sha-verify-b570e91.json`) |
| Assemble logs | `assembleRelease-b570e91.log`, `assembleRelease-b570e91-restamp.log` |

## Evidence tiers (ledger)

| Issue | Implemented+unit | Live API | Physical |
|-------|------------------|----------|----------|
| M-01 Home amplify | Yes | — | **Blocked** |
| M-02 Analytics | Yes | Yes (classification probe) | **Blocked** |
| M-03 Classroom labels | Yes | — | **Blocked** |
| M-04 Submit/reopen | Code intact | Fixture read-back Yes | Submit **Blocked** |
| M-05 Instructor fixture UI | Prior historical | — | **Blocked** (not re-run) |
| M-06 Document/Mathpix | Class IDs Yes | Endpoint shape Yes | OCR/save **Blocked**; Mathpix claim pending same-source |
| M-07 Class Overview | Yes | Partial historical | **Blocked** |
| M-08 Pundefined Templates | Yes | — | **Blocked** |
| M-09 Share modal | Prior Yes | — | **Blocked** |
| M-10 Push | — | — | **Blocked** |

## Web / mobile comparison (sanitized)

- Login: `POST /api/v1/auth/login` `{username_or_email,…}` → student **70** / instructor **66**
- Analytics: `GET …/dashboard/quizzes?view_type=student_total_details` → 51 rows; status-first matches web Status vs Availability columns
- Fixture: check-record (string `p_student_id`) 200; attended-quiz 200
- Document: mobile+web `POST /api/v1/batch-ocr-upload`

## Matrix disposition

Prior stack-gate snapshot remains **`diagnostic_regression`** for the multi-PR aggregate. PR #26 row historically **tsGenuine 0 / eslintGenuine 0** @ `0f75610`. This pass does **not** re-claim full-stack release approval; PR26 remains DRAFT acceptance/integration.

## Exact remaining blockers

1. Connect OPPO `OBAAZLSK5DFIGYZ5` → `adb install -r` preserve-data of `eduvijna-acceptance-release-b570e91-universal.apk` → consolidated physical suite (submit/reopen, analytics UI, Class Overview, Timetable Templates, document save/history).
2. Capture successful **dev-web** + failing **mobile** Mathpix/provider requests for the same source/mode before declaring backend configuration required.
3. Push delivery/tap after device FCM registration.

## Install command (when device ready)

```powershell
adb -s OBAAZLSK5DFIGYZ5 install -r `
  C:\Users\kanne\dev\Eduvijna-pr26-closure\.stack-validation-logs\founder-acceptance\eduvijna-acceptance-release-b570e91-universal.apk
```
