# Founder acceptance — runtime pass (2026-10-11)

**Branch:** `integration/mobile-founder-acceptance-20261011`  
**HEAD (this pass):** `211371ce6019a6c15ffef86257749f6e91c4cc0d`  
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
| Journey A — Assessments → students → Aarya → worksheet | **FAIL** | Fixture quiz located on **Expired** tab (`MAT_Mathematics…`); student-list tap still mis-targets adjacent card — automation fix in progress |
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
