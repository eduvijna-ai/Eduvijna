# Independent Re-review — Draft PR #27 after remediation

## Verdict

**Request changes.**

The remediation materially improves the branch, and the focused tests pass, but it does not close all prior findings. Two P0 answer-identity issues remain in production behavior: duplicate-text answers are still rendered/recounted incorrectly in the inline results UI, and attended-result identity is trusted without structural or alignment validation. P1 camera-departure behavior also remains incomplete. Several claimed closures have implementation support but omit the regression tests explicitly required by the prior review.

Reviewed state:

- Branch: `fix/mobile-crossplatform-p0-stabilization`
- HEAD: `0eef27234eeaed6384ebd87cd4fea70652cf0b33` (`2d031ea` is the substantive remediation commit)
- Scope: `git diff origin/main...HEAD`
- Working tree before this report: clean

## Prior finding status

### P0-1 — Duplicate-text selections are persisted by index but still graded by text

**Open.**

The submit and persistence path is substantially fixed:

- `computeLocalQuizResults` and `reconcileResultsWithExplanations` receive `selectedDisplayIndices`.
- `freezeAttemptQuestionSnapshot` grades with the selected display index.
- The duplicate first/second cases assert frozen `isCorrect`.

However, the inline results path still recomputes the score with text-only grading. `QuizTakingScreen.calculateResults` calls `isQuizAnswerCorrect` without `selectedDisplayIndices`, then uses that result for the displayed score and counts. When the second of two identical options is the correct/selected option, the text resolver chooses the first duplicate and the UI reports the correct submission as wrong.

Option coloring has the same defect: `isOptionTheCorrectAnswer(option, effectiveCurrentQuestion)` is called without the mapped option index. With duplicate text and a correct second duplicate, neither duplicate is reliably identified as the correct display option, and the selected correct option can be colored as wrong.

The authoritative `questionResults` state already contains the index-aware result and should drive inline counts; option correctness should pass `index`.

### P0-2 — Normal attended-result reopen discards the frozen question identity

**Open.**

The happy path is fixed: `normalizeAttendedQuizResponse` now prefers `answer_identity`, and the new test proves that aligned identity overrides changed attended items.

The required validation/fallback is not implemented. `isAttemptAnswerIdentityV1` checks only `version === 1` and `Array.isArray(questions)`. `normalizeAttendedQuizResponse` then accepts any non-empty identity before considering complete attended items. It does not verify snapshot shape, option/index bounds, question IDs/count/order, or alignment with attended items/log entries. A partial identity can discard complete attended questions; malformed array entries can throw while dereferenced.

Identity should become authoritative only after structural validation and alignment checks; otherwise normalization should safely fall back to attended items/log data. Tests should cover partial, misaligned, and malformed identity.

### P1-1 — `generateFromSavedBooks` rejects the newly claimed `questions` payload

**Open (implementation corrected; required test closure incomplete).**

`SavedBooksGenerateResult` and `isLegacySavedBooksGenerateResult` now accept top-level `questions`, so the synchronous production gate is corrected. Persisted jobs return `result`/`result_payload`, which the screen extractor can consume.

The required service-level regressions are absent. `documentCurriculumFromBooks.extract.test.ts` still tests only the extractor, while `savedBooksGenerationJobs.test.ts` uses `quiz` for both immediate and persisted-job cases. Add `generateFromSavedBooks` tests proving `questions` works for both synchronous and accepted-job responses.

### P1-2 — Explanation content remains trusted when no verified key exists

**Open (implementation corrected; required test closure incomplete).**

The component now quarantines generated correctness/reasons/facts when no persisted key exists and displays no API-derived “Correct Answer.” That code addresses the production defect.

The claimed no-key regression test was not added. `QuizExplanationAccordion.quarantine.test.tsx` contains only the contradictory-key case. Add a no-persisted-key test that asserts the API answer, reason, wrong-option explanations, and educational fact are not rendered.

### P1-3 — Camera cancellation does not cover unmount or all camera entry points

**Open.**

Home capture and Preview add-page now use operation IDs, check them around persistence/navigation, and invalidate on unmount. The original closure requirement also called for blur/screen-departure invalidation. Neither screen increments its camera operation ID in focus-effect cleanup, so a native navigation stack that retains the screen can allow pending capture work to continue after blur.

`DocumentUploadHomeScreen.handleCameraTilePress` also performs unguarded state writes in `catch`/`finally`; after unmount invalidates the operation and a pending picker resolves, `finally` still calls `setCapturing(false)` and may call `setSuccess`.

No deferred-promise tests cover blur, unmount, or timeout for either camera entry point.

### P1-4 — Loading cancellation fallback is dead on web and when the root ref is not ready

**Open (known call sites improved; required behavioral proof incomplete).**

The web shell now passes navigation, `leaveToHome` prefers the screen adapter, and unmount invalidates the open-quiz request. Those changes address the known web path.

The “late fetch” test still cancels immediately after `handleOpenQuiz` starts, during the initial 100 ms delay. `resolveFetch` therefore still points to its no-op initializer; the fetch never starts. The test does not prove that cancellation suppresses a genuinely late in-flight fetch response. There is also no `QuizLoadingScreen` test for the web adapter or no-root-ref fallback.

Add a test that waits until the mocked fetch has actually been invoked before cancelling/resolving, plus component-level navigation tests for web and unavailable global navigation.

## Residual findings

### Residual P0

1. Duplicate-text inline result score/count/coloring remains index-unsafe (P0-1).
2. Unvalidated or misaligned `answer_identity` can override complete attended data or throw (P0-2).

### Residual P1

1. Camera operations are not invalidated on blur, Home has stale post-await state writes, and deferred cancellation tests are absent (P1-3).
2. Required end-to-end/test closure remains missing for saved-books `questions`, no-key explanation quarantine, and genuinely in-flight loading cancellation (P1-1, P1-2, P1-4).

### Residual P2 / nits

- `npm run type-check -- --pretty false` still fails with 217 TypeScript errors. Touched scope includes:
  - `src/screens/QuizTakingScreen.tsx`: unused `QuizAvailability`
  - `src/screens/QuizTakingScreen.tsx`: unused `theme`
  - `src/__tests__/assessmentQuizStart.service.test.ts`: stale `AssignedQuizRecoveryResumeParams` fixture
- `git diff --check origin/main...HEAD` still reports trailing whitespace in the hosting and P0 handoff documents.
- The open-quiz normalizer still permits an empty question list; the branch does not explicitly justify or reject that route before `QuizTakingScreen`.

## Verification run

Focused Jest command requested for this review:

`node --max-old-space-size=4096 node_modules/jest/bin/jest.js --forceExit --runInBand --testPathPattern="swachhBharat|quizResultNormalization|QuizExplanationAccordion.quarantine|openQuizRequestGuard|documentCurriculumFromBooks.extract|savedBooksGenerationJobs|answerMappingPermutation"`

Result: **8 suites passed, 39 tests passed, 0 failed**.

Passing tests confirm the covered happy paths, but they do not exercise the residual paths identified above.

## Independence statement

This is an independent re-review of Draft PR #27 at `0eef272`, including the full `origin/main...HEAD` diff and the working-tree state. The remediation handoff and its claimed dispositions were treated as assertions to verify, not as approval evidence. Production call paths, boundary validation, UI recomputation, and test timing/coverage were checked separately; the verdict is therefore not a rubber-stamp.
