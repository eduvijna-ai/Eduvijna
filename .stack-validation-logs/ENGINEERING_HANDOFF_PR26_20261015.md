# PR #26 engineering handoff (2026-10-15)

**Disposition:** Engineering gates for installed release **B / bell C / logout A / signed-out** are **PASS** on APK `2fb85b0`. **Push delivery/tap** remains **BLOCKED** (emulator). **PR #26 stays DRAFT** — commit harness delta and push before Founder sign-off.

---

## Worktree / identity

| Item | Value |
|------|--------|
| Worktree | `C:\Users\kanne\dev\Eduvijna-pr26-closure` |
| Branch | `integration/mobile-founder-acceptance-20261011` |
| Pushed harness baseline | `b94af62` (Maestro cold-start + instructor login path) |
| **Local harness delta** | Uncommitted — see `git diff` (Java 17 for Maestro, installed Journey B runner, notifications classifier, credentials path, inplace login flow) |
| **Tested product SHA** | `2fb85b0` (`Fix release login state sync for Android secure password entry.`) |
| **Installed APK SHA-256** | `F37F33F24C41E613AE5A6E94769DD22EBBF8360DB18087815DC52C5F8479D6BE` |
| Primary `Eduvijna` / Quiz-React | Unchanged (primary checkout left as-is) |

---

## Fixture B + Journey B

| Check | Result | Evidence |
|-------|--------|----------|
| API fixture 479 / session `a6882262-…` / class `class_4d82c60e` / student 70 / attempt 207 | **PASS** — index **25**, quiz list **page 3 of 3** | `node -e` probe via `loadFixtureAnalyticsQuizPage()` @ harness run |
| **Android Journey B** (Analytics → date range → class drill → quiz page 3 → View Analytics → saved result 60% / 6/10) | **PASS** | `.stack-validation-logs/engineering-installed-smoke/android-journey-b-installed-2026-10-15T05-15-03/` (`journey-b.json` `pass: true`, `meta.json` `testedApkImplementationSha: 2fb85b0`) |

**Root cause (prior BLOCKED):** Maestro 2.x failed when `JAVA_HOME` pointed at JDK 11 (`C:\Users\kanne\AppData\Local\jdk-11.0.2`) despite JDK 17 on PATH. **Fix:** `scripts/lib/resolve-maestro-java-home.mjs` + use in Maestro entrypoints.

**Harness:** `scripts/engineering-android-journey-b-installed.mjs` + `ENGINEERING_INSTALLED_RELEASE=1` path in `scripts/android-founder-journeys.mjs` (skips Metro bundle gate; Maestro login for shell).

**Note:** `engineering-instructor-fixture-ui.mjs` (Assessments scroll path) is **not** Journey B; prior FAILs included Maestro exit 1 and API rate-limit — **not** cited as fixture B acceptance once Journey B is green.

---

## Gate table (installed release APK `2fb85b0`)

| Gate | Result | Evidence path |
|------|--------|----------------|
| Maestro instructor login | **PASS** | `engineering-installed-smoke/maestro-login-2026-10-15T05-13-53/` |
| **B — Journey B / fixture 479→70→207** | **PASS** | `engineering-installed-smoke/android-journey-b-installed-2026-10-15T05-15-03/` |
| **C — Notifications bell → route** | **PASS** (`routeOk: true`, instructor “New submissions”) | `engineering-installed-smoke/notifications-smoke-2026-10-15T05-24-51/` |
| **A — Logout / session clear / relaunch login** | **PASS** | `engineering-installed-smoke/logout-session-smoke-2026-10-15T05-25-14/` |
| Signed-out cold `openquiz` → inplace Maestro → results 60% / 6/10 | **PASS** | `engineering-installed-smoke/deeplink-signed-out-probe-2026-10-15T05-27-10/` |
| Push delivery + notification tap | **BLOCKED** | Emulator FCM limitation (documented in notifications `delivery.status`) |
| `npm run test:journey-logic` | **PASS** (28/28) | local 2026-10-15 |
| `scripts/__tests__/android-founder-journey.logic.test.mjs` | **PASS** (25/25) | local 2026-10-15 |
| Full stack matrix @ harness HEAD | **Not re-run this session** | Prior: `stack-validation-pr26-only-cd30266-pass.json`; guarded full matrix logs under `.stack-validation-logs/stack-validate-full-matrix-*` |

---

## Code review summary (harness-only delta)

- **Maestro Java:** Prefer JDK 17+ when `JAVA_HOME` is stale (fixes false “Java 17 required” on Windows).
- **Installed Journey B:** Release mode bypasses Metro `engineering_bundle_not_verified`; evidence under `engineering-installed-smoke/`.
- **Notifications classifier:** Accept instructor header **“New submissions”** (bell route was correct; assertion was stale).
- **Credentials:** `founder-fixture.mjs` resolves `../Eduvijna/.dev-api-credentials.local.json`; analytics `created_to` extended to **2026-10-15**.
- **Signed-out:** Restored/aligned `engineering-release-login-inplace.yaml` for inplace Maestro login.

No product (`src/`) changes → **no new APK build required** for this validation pass.

---

## Remaining before Founder acceptance

1. **Commit and push** harness/scripts delta on `integration/mobile-founder-acceptance-20261011` (keep PR **DRAFT**).
2. Re-run **guarded full stack matrix** if prior `stack-validate-full-matrix-*` run did not finish with disposition JSON.
3. **Physical device** push delivery/tap when hardware + FCM path available.
4. Optional: rerun `engineering-instructor-fixture-ui.mjs` off-peak if Assessments shortcut path needed for Founder demo (not a substitute for Journey B).

---

## Next actionable step

Commit local harness changes, push branch, attach this handoff + evidence folder names to PR #26, then schedule Founder emulator walkthrough on APK checksum above (no Metro).
