# EduVijna — P0 Cross-Platform Stabilization Handoff (2026-10-27 / closure 2026-10-28)

Branch: `fix/mobile-crossplatform-p0-stabilization`  
Baseline: `origin/main` @ `0e81f9e3dfb8b88f4dab6c7b7158819c602b9a2c`  
DRAFT PR: https://github.com/eduvijna-ai/Eduvijna/pull/27  
Prior verified HEAD: `93e679f051b3d7b764f99e44fc0e4938bdd0b86a`  
Architect closure HEAD: `ea0d908e799eeb2d395250d9630b0f1aebf26e39`

Scope: seven Founder defects + Chief Architect eight-gate closure. No production API secret changes. Physical-phone LAN remains **ON HOLD**.

## Status matrix (2026-10-28)

| Gate | Result |
|------|--------|
| Gate 1 — Answer identity in production submit/persist/reopen | **PASS** (code + Jest) |
| Gate 2 — Full explanation quarantine + Swachh integration | **PASS** (code + Jest) |
| Gate 3 — Real From Books `generateFromSavedBooks` extraction | **PASS** (code + unit); live API journey **PENDING**/device |
| Gate 4 — Cancel-safe camera + deep-link stale nav | **PASS** (code + Jest) |
| Gate 5 — Handoff Metro commands vs `package.json` | **PASS** (reconciled to committed scripts) |
| Gate 6 — Full engineering validation / emulator E2E | **PARTIAL** — focused Jest PASS; emulator **BLOCKED** (`adb devices` empty) |
| Gate 7 — Independent review of full PR diff | **PENDING** (report attached after review run) |
| Gate 8 — Hosting AASA / assetlinks | **BLOCKED** — AASA 404; assetlinks HTTP 500; Team ID / fingerprints not inventable |
| `npm run config:verify` | run on deliver |
| `npm run type-check` | compare vs baseline; see evidence |
| Physical Android / iOS | **PENDING** Founder authorization |
| `READY_FOR_FOUNDER_EMULATOR_TESTING` | **false** until emulator evidence exists |
| `READY_FOR_CROSSPLATFORM_RELEASE` | **false** (hosting + physical incomplete) |

---

## Architect closure — root causes

### Gate 1 — Correctness and persistence
**Finding:** `attemptAnswerIdentity` was test-only; production `buildAssignedQuizLogData` / reopen paths did not freeze display indices.  
**Fix:** `buildAssignedQuizLogData` embeds `answer_identity` v1 + `userAnswerText` / display indices; `quizResultNormalization` prefers identity on reopen; QuizTakingScreen tracks `selectedDisplayIndices` for duplicate option text; unknown/unresolvable keys stay unknown via `evaluatePersistedAnswerCorrectness` (no explanation regrade).  
**Invariant evidence:** `src/__tests__/swachhBharatSubmissionReopen.integration.test.ts`.

### Gate 2 — Explanation consistency
**Finding:** Accordion quarantined contradictory `correct_answer` but still rendered `correct_reason` / `wrong_options` / fact.  
**Fix:** When `explanationContradictsKey`, show verified answer + explanation-unavailable only; omit conflicting body entirely.  
**Evidence:** `QuizExplanationAccordion.quarantine.test.tsx` + Swachh reopen suite.

### Gate 3 — From Books generation
**Finding:** Prior work focused on `generateFromBook`; real path is `DocumentCurriculumFromBooksScreen` → `generateFromSavedBooks`. Early empty checks used `res.quiz?.length` only, missing `questions` / nested `result.quiz`.  
**Fix:** `extractQuizArrayFromGenerationResponse` expanded; both aligned and non-aligned early checks use it before preview handoff.  
**Evidence:** `documentCurriculumFromBooks.extract.test.ts`. Live generate/save/reopen on emulator: **BLOCKED** (no device).

### Gate 4 — Cancel-safe async
**Camera:** Timeout now invalidates `cameraCaptureOpIdRef` so late `processCameraCapture` cannot persist/navigate.  
**Deep link:** `openQuizRequestGuard` generation token; Cancel/watchdog calls `cancelPendingOpenQuizRequest`; `leaveLoading` / view-results nav no-ops when stale; App adapter uses `StackActions.replace` / `CommonActions.navigate` (no assumed `navigationRef.replace`).  
**Evidence:** `openQuizRequestGuard.test.ts`.

### Gate 5 — Environment commands
**Finding:** Handoff referenced `npm run start:device:lan`, absent from this branch’s committed `package.json`.  
**Resolution:** Use verified committed script (do **not** cherry-pick LAN WIP stash):

```powershell
npm run start:device
```

(`node scripts/with-eduvijna-api-env.mjs development -- expo start --dev-client --lan`)

LAN emulator WIP remains stashed separately: `preserve/expo-lan-emulator-setup-wip-20261027-evening` on branch `chore/expo-lan-emulator-setup-20261027` — **explicit prerequisite** only if Founder needs Mode-B `10.0.2.2` scripts; not silently merged into PR #27.

### Gate 8 — Hosting
See `docs/development/HOSTING_UNIVERSAL_LINKS_HANDOFF_20261028.md`.  
`ios.associatedDomains` preserved. Public AASA **404**; assetlinks **500**. Apple Team ID and release SHA-256 **not** present as verified values in-repo (placeholders only).

---

## Founder commands (this branch)

```powershell
cd D:\Eduvijna-Android-App\Eduvijna
git checkout fix/mobile-crossplatform-p0-stabilization
. .\scripts\setup-android-env.ps1
npm run start:device
```

Focused regression:

```powershell
node --max-old-space-size=4096 node_modules/jest/bin/jest.js --forceExit --runInBand --testPathPattern="documentAssessmentNavigation|quizGenerationTiles.production|swachhBharat|documentUploadNormalizeQuestions|answerMappingPermutation|openQuizHandler.routing|openQuizRequestGuard|QuizExplanationAccordion.quarantine|documentCurriculumFromBooks.extract|quizResultNormalization"
```

---

## Remaining before release

1. Publish AASA + assetlinks with real Team ID / signing fingerprints (Gate 8).  
2. Emulator E2E (Gate 6) then Founder-authorized physical device.  
3. Independent review findings fixed (Gate 7).  
4. Do **not** set `READY_FOR_CROSSPLATFORM_RELEASE=true` until hosting + physical complete.
