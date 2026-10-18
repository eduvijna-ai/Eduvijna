# Founder mobile regression — final handoff (review correction pass)

**PR:** #26 DRAFT — recovery not accepted  
**Branch:** `integration/mobile-founder-acceptance-20261011`  
**Review baseline:** `54fa5fb`  
**This pass:** review corrections 1–7 (status-first analytics, class identity, ERP errors/pagination, dashboard coalesce, product investigation, isolated APK, evidence)  
**API:** `https://dev-api.eduvijna.com` · **Web:** `https://dev.eduvijna.com`  
**Device:** OPPO `OBAAZLSK5DFIGYZ5` — connect/unlock only when ready; no emulator fallback.

## Corrections landed

1. **Analytics** — shared `studentAnalyticsClassification` (status-first; availability separate). Live: 51 rows, 25 completed with null score, completed+expired present. Pending-with-score covered by unit tests (not present in current live cohort).
2. **Saved-books classes** — `normalizeSavedBooksClassOptions` keeps distinct IDs; disambiguates colliding labels with `(#id)`.
3. **ERP Class Overview** — per-section error/retry; `fetchAllPages` (no silent 500/200 caps); `loadGenRef` stale guard; KPI shows `—` on section error; teacher roster never broadens when assignments empty/fail.
4. **Student Home** — identical in-flight coalesced; loading owned by latest owner; list epoch from `refreshStudentAssignmentDashboard` defeats 8s focus stale window after submit refresh.
5. **Product investigation** — fixture 479 attended-quiz **200** (10 items); check-record string `p_student_id` contract confirmed. Document: mobile/web share `/api/v1/batch-ocr-upload` (empty → 422 files). Mathpix-config claim still needs same-source web success + mobile fail Network capture. **Pundefined:** root cause was ERP **Timetable Templates** list falling through `item.name` to `P${period_number}` — fixed via `template_name` + `P—`.
6. **APK** — built at isolated `C:\ev-rc` (android retained; no `--clean` prebuild on primary checkout). Identity recorded below after assemble.
7. **Tests/gates** — focused Jest 17/17; ledger tiers updated; commit/push without force.

## APK identity
_(filled after assembleRelease)_

| Field | Value |
|-------|-------|
| Product SHA | _pending build_ |
| API env | `EDUVIJNA_API_ENV=development` → `https://dev-api.eduvijna.com` |
| App version | `1.0.0` (`app.json` / `runtimeVersion`) |
| APK path | _pending_ |
| SHA-256 | _pending_ |

## Physical suite
**Blocked** until OPPO attached. Founder action: connect + unlock + approve system prompts. Install preserve-data (`adb install -r`).

## Exact remaining blockers
1. OPPO reconnect → install/release suite (submit/reopen, document save/history, Templates UI, analytics screens).
2. Same-source Mathpix/provider request pair before backend-config declaration.
3. Push delivery/tap.
4. Matrix rows outside PR26 slice remain prior disposition; this pass does not claim full-stack release approval.

## Evidence paths
- Ledger: `.stack-validation-logs/FOUNDER_MOBILE_REGRESSION_ISSUE_LEDGER_20261018.md`
- Live probes: `.stack-validation-logs/review-api-probes-20261018/`
