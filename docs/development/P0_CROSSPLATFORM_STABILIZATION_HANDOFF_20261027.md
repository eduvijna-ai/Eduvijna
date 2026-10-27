# EduVijna — P0 Cross-Platform Stabilization Handoff (2026-10-27)

Branch: `fix/mobile-crossplatform-p0-stabilization`  
Baseline: `origin/main` @ `0e81f9e3dfb8b88f4dab6c7b7158819c602b9a2c`  
Scope: seven Founder-reported defects in one coordinated batch. No production API secret changes.

## Status

**BLOCKED** for Founder acceptance until physical-device / hosting gates below clear.  
Engineering code + focused unit regressions for Issues 1–6 are implemented on this branch.

| Gate | Result |
|------|--------|
| Branch cut from verified main | **PASS** |
| Focused Jest (28 tests) | **PASS** |
| `npm run config:verify` | **PASS** |
| `npm run type-check` | **FAIL** (pre-existing suite errors across many `__tests__`; no new errors attributed to core fix files) |
| Android physical release-like | **BLOCKED** — no physical device on ADB this session |
| iOS physical Universal Links | **BLOCKED** — Windows host; AASA `https://app.eduvijna.com/.well-known/apple-app-site-association` returns **404** |
| Android assetlinks verification | **BLOCKED** — `/.well-known/assetlinks.json` fetch timed out / not verified |
| Expo Web manual journeys | **PENDING** |
| Quiz-React parity | **PENDING** (shared API contract only; no Quiz-React code change yet) |
| Codex independent review | **PENDING** |

---

## Issue summaries

### Issue 1 — Document entry mismatch
**Root cause:** Dashboard `resolveQuizGenerationNavigation` redirected Document tiles to `AssessmentWorkspaceScreen`, while '+' opened `DocumentUploadHomeScreen`. Fallback '+' menu also listed two Document entries.  
**Fix:** Canonical `resolveDocumentAssessmentNavigation` → always `DocumentUploadHomeScreen`. Grid + modal share `resolveQuizGenerationNavigation`.  
**Files:** `src/core/utils/documentAssessmentNavigation.ts`, `quizGenerationTiles.ts`, `CreateAssessmentModal.tsx`, tests.

### Issue 2 — Camera continuous loading
**Root cause:** Post-capture processing could hang without a bound; spinner relied solely on `finally`.  
**Fix:** 60s timeout around `processCameraCapture`; stage messages; guaranteed `setCapturing(false)`.  
**Files:** `DocumentUploadHomeScreen.tsx`.  
**Device evidence:** **BLOCKED** (needs emulator/physical camera capture confirmation).

### Issue 3 — Generation returned no questions
**Root cause:** `normalizeQuestions` ignored nested `quiz.*` / `questions.quizzes` shapes and coerced non-letter answers to `'A'`; empty nested payloads became zero questions silently.  
**Fix:** Unwrap nested shapes; preserve full-text keys; `extractQuestionsPayload`; throw actionable errors from `generateFromBook` / multimodal when empty.  
**Files:** `documentUploadApi.ts`, tests.

### Issues 4–5 — Option / explanation inconsistency (Swachh Bharat)
**Root cause:** `withAuthoritativeCorrectAnswer` updated text without `correctOptionIndex`; `reconcileResultsWithExplanations` regraded from explanation API; results UI used text match.  
**Fix:** Index-aware highlighting; explanations never override verified keys; quarantine contradictory explanation keys; `attemptAnswerIdentity` v1 contract; mandatory Swachh Bharat fixture.  
**Files:** `answerMappingUtils.ts`, `attemptAnswerIdentity.ts`, `QuizResultsScreen.tsx`, `QuizTakingScreen.tsx`, `QuizExplanationAccordion.tsx`, tests.

### Issue 6 — Deep-link Back / Cancel stranded on Validating quiz…
**Root cause:** Recovery-probe alert Cancel returned while still on `QuizLoadingScreen`.  
**Fix:** Cancel → `Main/Dashboard` via `replace`; all exit paths use `leaveLoading`; loading screen Cancel + 45s watchdog; App adapters expose `replace`.  
**Files:** `openQuizHandler.ts`, `QuizLoadingScreen.tsx`, `App.tsx`, `BottomTabNavigator.tsx`, tests.

### Issue 7 — iOS Universal Links / Android Home after deep link
**Code fix:** `ios.associatedDomains: ["applinks:app.eduvijna.com"]` in `app.json`; deep-link leave navigates to Dashboard (Issue 6).  
**Hosting:** AASA **404** — Universal Links cannot work until Apple Team ID + `com.eduvijna.app` AASA is published. Android App Links assetlinks **not verified**.  
**Physical:** **BLOCKED**.

---

## Founder commands (after merge / on this branch)

```powershell
cd D:\Eduvijna-Android-App\Eduvijna
git checkout fix/mobile-crossplatform-p0-stabilization
. .\scripts\setup-android-env.ps1
npm run start:device:lan
```

Focused regression:

```powershell
node --max-old-space-size=4096 node_modules/jest/bin/jest.js --forceExit --runInBand --testPathPattern="documentAssessmentNavigation|quizGenerationTiles.production|swachhBharatAnswerIdentity|documentUploadNormalizeQuestions|answerMappingPermutation|openQuizHandler.routing"
```

---

## Remaining prerequisites before READY FOR FOUNDER ACCEPTANCE

1. Publish valid AASA at `https://app.eduvijna.com/.well-known/apple-app-site-association`.
2. Publish / verify Android Digital Asset Links for the release signing cert.
3. Newly signed iOS build including associated domains; physical Universal Link test.
4. Physical Android App Links + Home/Dashboard after openquiz.
5. Camera capture + From Books generation on device with redacted API evidence.
6. Codex review of this PR; resolve P0/P1 findings.
7. Optional: clear pre-existing `tsc` test-file debt or exclude tests from `type-check` consistently.

LAN environment WIP remains stashed as `preserve/expo-lan-emulator-setup-wip-20261027-evening` (separate from this branch).
