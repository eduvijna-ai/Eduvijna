# Independent Third-pass Review — Draft PR #27 after R2 remediation

## Verdict

**Request changes.**

R2 closes the duplicate-text inline result defect and the saved-books/explanation regressions, and the requested focused Jest run passes. It does not close the remaining P0 attended-result identity issue: the new “alignment” check compares only array length. A valid same-length identity from another quiz, or the same questions in a different order, is still accepted as authoritative over complete attended data.

Reviewed state:

- Branch: `fix/mobile-crossplatform-p0-stabilization`
- HEAD: `82dc4c26af5fbe78b0a6dc0dd705ab00dc48a00e`
- Scope: R2 claims checked against current production paths, tests, and `git diff origin/main...HEAD`
- Working tree before this report: clean

## Residual finding status

### P0-1 — Duplicate-text inline score/count/coloring

**Closed.**

`QuizTakingScreen.calculateResults` now prefers the authoritative, index-aware `questionResults` and passes `selectedDisplayIndices[index]` to its fallback grading call. Option coloring passes the rendered option index to `isOptionTheCorrectAnswer`. The persisted submission/reopen duplicate cases remain covered by the focused tests.

There is still no component-level assertion of the inline score and colors, but the production calls that caused the defect are corrected. This is a test-coverage nit rather than an open correctness finding.

### P0-2 — Unvalidated or misaligned `answer_identity`

**Open.**

Structural validation is improved, and partial-count and malformed-entry tests now safely fall back. However, `isAnswerIdentityAligned(identity, expectedQuestionCount)` checks only:

- expected count is positive; and
- identity question count equals expected count.

It does not compare question IDs, normalized question text, or question order with `attended.items` or `log_data.answers`. Therefore, a structurally valid identity with the same number of unrelated or reordered questions is accepted by `normalizeAttendedQuizResponse` and replaces complete attended data. The test named “partial or misaligned” covers only a one-versus-two count mismatch, not identity/order misalignment.

Structural validation also remains incomplete for the claimed option/index guarantees: `originalIndex` is only checked as a number (not integer, non-negative, or bounded), `displayIndex` need not be an integer, `displayText` need not equal `optionsDisplayed[displayIndex]`, and `optionOrder` is not validated.

Required closure: validate identity against the available attended/log question identity and order, reject same-count mismatches, fully validate option identity/permutation consistency, and add same-count wrong-question and reordered-question fallback tests.

### P1-1 — Saved-books top-level `questions` service coverage

**Closed.**

`savedBooksGenerationJobs.test.ts` now proves `generateFromSavedBooks` accepts top-level `questions` for both synchronous and accepted-job/persisted responses.

### P1-2 — No-key explanation quarantine coverage

**Closed.**

The added no-key test proves the generated answer, reason, wrong-option explanation, and educational fact are not rendered without a verified persisted key.

### P1-3 — Camera blur/unmount/timeout cancellation

**Open (production guards corrected; required behavioral proof still absent).**

Home and Preview now invalidate camera operation IDs on focus cleanup, and Home guards `catch`/`finally` state writes. These changes address the reviewed production paths. No deferred-promise screen test exercises blur, unmount, or timeout for either camera entry point, so the explicit regression-test closure requirement remains unmet.

### P1-4 — Loading cancellation fallback and genuinely late fetch

**Open (in-flight race corrected; component fallback proof still absent).**

The revised guard test now waits until `fetchQuizDetailsBySessionId` is genuinely in flight before cancellation and proves that late completion does not navigate to `QuizTakingScreen`.

The previously required `QuizLoadingScreen` behavioral tests are still absent: no test renders the screen with the web/screen navigation adapter, and no test proves fallback behavior when the global root navigation ref is unavailable. The implementation appears to prefer `dispatch`, `replace`, and `navigate` correctly, but that remaining closure claim is not independently exercised.

## Residual P2 / nits

- `git diff --check origin/main...HEAD` still fails on trailing whitespace in `HOSTING_UNIVERSAL_LINKS_HANDOFF_20261028.md` and `P0_CROSSPLATFORM_STABILIZATION_HANDOFF_20261027.md`.
- The focused Jest process reports that it is force-exiting and suggests `--detectOpenHandles`; this did not fail the run but indicates outstanding async handles.
- Add a direct `QuizTakingScreen` regression for duplicate-text inline score and option coloring.

## Verification run

Requested command:

`node --max-old-space-size=4096 node_modules/jest/bin/jest.js --forceExit --runInBand --testPathPattern="swachhBharat|quizResultNormalization|QuizExplanationAccordion.quarantine|openQuizRequestGuard|documentCurriculumFromBooks.extract|savedBooksGenerationJobs|answerMappingPermutation"`

Result: **8 suites passed, 44 tests passed, 0 failed**.

## Independence statement

This verdict treats `INDEPENDENT_REVIEW_REMEDIATION_R2.md` as a set of claims, not approval evidence. Each prior residual finding was checked against current HEAD and the relevant production/test paths. The green focused suite does not override the uncovered same-count identity-misalignment path.
