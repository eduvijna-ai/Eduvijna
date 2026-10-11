# Founder acceptance — runtime pass (2026-10-11)

**Branch:** `integration/mobile-founder-acceptance-20261011`  
**HEAD (this pass):** `42e2211` (+ journey script `chore` follow-up on same branch).  
**PR:** #26  

## Live API probes (separate from UI)

| Check | Result |
|--------|--------|
| Instructor/student login + fixture quiz 479 / attempt 207 / session | PASS |
| Worksheet attended-quiz score 60 | PASS |
| Document history bucket counts | PASS |

Redacted artifact (gitignored): `.dev-api-document-workflow-run/runtime-evidence/live-api-acceptance-redacted.json`

## Runtime UI (this pass)

### Android dev client (Metro 8082)

| Item | Result | Notes |
|------|--------|--------|
| Dev client bootstrap (no `pm clear`) | PASS | `adb reverse`, `127.0.0.1:8082` deep link, dev-menu reload |
| Normal login (`demo_samatha`) | PASS | Per-char `adb input text` for password; Enter submit; push overlay dismissed |
| Journey A — Assessments → students → Aarya → worksheet | **FAIL** @ `42e2211` | Expired tab OK; duplicate `MAT_Mathematics…` cards — automation opened wrong quiz (`PRO_Assessment_20261007`); `assessment-open-students-479-*` not exposed in UIAutomator dump |
| Journey B — Analytics drilldown | **NE** | Blocked on A stability |
| Document history UI | **NE** | |
| From Books CBSE → 10 → Math | **NE** | |
| Recent Completions (current HEAD) | **NE** | |

Evidence (gitignored): `.dev-api-document-workflow-run/runtime-evidence/android-journeys/` (UI XML, PNG, `journey-a.json`).

**Root causes addressed this pass**

1. Wedged Metro on 8082 → restart via `node ./node_modules/expo/bin/cli start --dev-client --port 8082`.
2. Clipboard unusable on emulator for passwords → character-at-a-time `adb input text`.
3. False “logged in” when bundle error screen → bootstrap login guards.
4. Fixture quiz is `availability_status: expired` → UI automation must open **Expired (9)** tab (see `fixture-in-summary-redacted.json`).

### Expo web (8083)

| Item | Result | Notes |
|------|--------|--------|
| Normal form login (Puppeteer) | **FAIL** | Login inputs not found within 60s — verify web dev server route/bundle for worktree |

## Regression

Run after script changes:

```bash
npm test -- --testPathPattern="quizResultRetrieval|studentListNavigation|documentAssessmentHistory|studentDashboardData"
npm run type-check
```

## Repair pass (requirements 1–8)

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | API auth / logout | **Implemented** | Typed refresh outcomes; session stamp on dispatch; 5xx safe extract; logout only on refresh rejection |
| 2 | Metro zustand SHA-1 | **Implemented** | Lazy zustand CJS map (skip missing `react.js`); Metro config loads on installed lockfile |
| 3 | Document Upload tabs | **Implemented** | From Books tab replaces On device; banner removed; library picker on Upload |
| 4 | From Books parity | **Partial** | Curriculum screen embedded; alignment OFF path / non-curriculum generate still open |
| 5 | Rich content | **Partial** | `EducationalContent` on quiz-taking, worksheet, explanations, document preview |
| 6 | Quiz nav API | **Partial** | `useQuizNavItems` + `isQuizNavScreenAllowed`; deep-link guard still open |
| 7 | Answer mapping | **Implemented** | Stable `correctOptionIndex` / permutation; case-sensitive; ambiguous text rejected |
| 8 | UI journeys | **Partial** | `testID` on assessment/student rows; automation updated |

## Physical device / push

Explicitly **unverified** (no device receipt).

## Scripts added/updated (committed)

- `scripts/android-bootstrap-dev-client.mjs`
- `scripts/android-login.mjs`
- `scripts/android-dismiss-overlays.mjs`
- `scripts/android-ui-dump.mjs`
- `scripts/android-founder-journeys.mjs`
- `scripts/web-ui-journey.mjs`
- `scripts/lib/founder-fixture.mjs`
- `scripts/founder-summary-has-fixture.mjs`
