# Independent Review — Draft PR #27

## Summary verdict

**Request changes.**

The branch improves several isolated cases, but the full committed plus working-tree scope does not yet close the P0 answer-identity problem. Duplicate option text can still be graded against the wrong display index, and the production attended-result reopen path does not use the frozen question/correct-answer snapshot. There are also P1 gaps in saved-books response acceptance, explanation quarantine, camera cancellation, and cross-platform loading cancellation.

Scope reviewed:

- `git diff origin/main...HEAD`
- `git diff` for tracked working-tree changes
- New untracked implementation/tests relevant to the closure claims
- Key navigation, submission, result-normalization, saved-books, document-camera, and explanation paths

## P0 findings (must fix)

### P0-1 — Duplicate-text selections are persisted by index but still graded by text

`QuizTakingScreen` records `selectedDisplayIndices`, but both live grading calls still receive only `selectedAnswers` (`src/screens/QuizTakingScreen.tsx:890-906`). `computeLocalQuizResults` and `reconcileResultsWithExplanations` ultimately call `isQuizAnswerCorrect(selectedAnswer, question)`, whose selected index is resolved from option text (`src/core/utils/answerMappingUtils.ts:124-144`). With duplicate text, that resolver selects the first matching option, regardless of the actual tapped index.

The frozen snapshot has the same inconsistency: `freezeAttemptQuestionSnapshot` uses `selectedDisplayIndexHint` to store `selected`, then calculates `isCorrect` from the text-only `isQuizAnswerCorrect` call (`src/core/utils/attemptAnswerIdentity.ts:103-134`). `buildAssignedQuizLogData` can then overwrite this value with the already text-graded `questionResults` (`src/core/utils/quizLogDataBuilder.ts:50-61`).

Impact: selecting the second of two identically rendered choices can produce the wrong score, persisted `isCorrect`, and result coloring even though the identity payload stores the tapped index. This is an answer-correctness defect, not a test-only edge case.

Required closure: grade from selected display/original identity when available, carry that identity through live grading and persistence, and add both duplicate cases (selected first/correct second and selected second/correct second). The current duplicate test only asserts stored indices; it does not assert score or `isCorrect`.

### P0-2 — Normal attended-result reopen discards the frozen question identity

When `attended.items` is populated, `normalizeAttendedQuizResponse` builds questions from the server items and uses `answer_identity` only for the user-answer text (`src/core/services/quizResultNormalization.ts:298-307`). It does not restore `optionsDisplayed`, `correct.displayIndex`, `correct.displayText`, `optionOrder`, or frozen `isCorrect`. `quizResultRetrieval.service.ts` then returns that branch directly (`src/core/services/quizResultRetrieval.service.ts:533-542`, `643-665`).

Consequently, the new immutable snapshot is honored only by the log-only fallback. In the ordinary attended response, reordered/mutated options or an absent `answer_key` can still change which option is shown as selected/correct, defeating the persistence-identity goal. The Swachh Bharat integration test calls `normalizeQuestionsAndAnswersFromLogData` directly, so it does not exercise this production branch.

Required closure: when a valid, aligned `answer_identity` exists, use its frozen question snapshot as the authoritative review model (with carefully validated fallback), including selected display index—not only selected text. Add an attended response test with complete `items` plus identity, including changed option order and a missing/stale answer key.

## P1 findings

### P1-1 — `generateFromSavedBooks` rejects the newly claimed `questions` payload before extraction

The screen helper now accepts top-level `questions`, but `generateFromSavedBooks` first gates synchronous responses through `isLegacySavedBooksGenerateResult`. That guard accepts `quiz`, worksheet, summary, lesson plan, etc., but not `questions` (`src/core/services/savedBooksContent.service.ts:515-527`). `SavedBooksGenerateResult` also declares only `quiz` (`src/core/services/savedBooksContent.service.ts:104-120`).

Therefore a questions-only saved-books response—the exact shape added to `documentCurriculumFromBooks.extract.test.ts`—throws `ASSESSMENT_GENERATION_FAILED` before `extractQuizArrayFromGenerationResponse` runs. The helper test bypasses the service contract and gives false closure confidence.

Required closure: normalize/accept the payload at the service boundary (including the actual persisted-job shapes), update the type, and test `generateFromSavedBooks` end-to-end through both synchronous and accepted-job responses.

### P1-2 — Explanation content remains trusted when no verified key exists

The accordion quarantines only when both `persistedKey` and API `correct_answer` are present and disagree (`src/components/QuizExplanationAccordion.tsx:142-158`). If the persisted result has no answer key, it falls back to the explanation API answer and renders it as “Correct Answer,” along with reasons and facts.

This conflicts with the new grading policy that explanation generation must not invent correctness. It is reachable for attended items with `is_correct` but no `answer_key`, especially because P0-2 bypasses the frozen identity question data.

Required closure: distinguish “verified key unavailable” from “API agrees with verified key.” Do not present generated correctness/reasons as authoritative without a verified persisted key; add a no-key quarantine test.

### P1-3 — Camera cancellation does not cover unmount or all camera entry points

`DocumentUploadHomeScreen` says the operation ID is bumped on timeout/unmount, but there is no unmount cleanup that increments `cameraCaptureOpIdRef` (`src/screens/document-upload/DocumentUploadHomeScreen.tsx:91-95`, `453-503`). Leaving the screen while the native picker or post-capture work is pending can still allow persistence and navigation after unmount.

`DocumentUploadPreviewScreen.handleAddCameraPage` also has no operation generation/cancellation guard (`src/screens/document-upload/DocumentUploadPreviewScreen.tsx:440-471`). The service timeout only bounds compression and returns the raw frame on failure; it does not cancel these caller-side continuations.

Required closure: invalidate operations on blur/unmount, guard every state write/persist/navigation after awaits, and apply the policy to both home capture and add-page capture. Add deferred-promise tests for unmount/blur and timeout.

### P1-4 — Loading cancellation fallback is dead on web and when the root ref is not ready

`QuizLoadingScreen.leaveToHome` calls `navigateToAppMainTab` and immediately returns inside a `try` (`src/screens/QuizLoadingScreen.tsx:37-47`). `navigateToAppMainTab` silently returns when `navigationRef` is not ready; it does not throw (`src/platforms/mobile/navigation/navigateToAppMainTab.ts:11-20`). Thus the local dispatch/replace/navigate fallback is unreachable.

The web shell renders `QuizLoadingScreen` without a navigation prop (`App.tsx:949-952`), so Cancel/watchdog invalidates the request but can leave the user on the loading screen permanently. Unmount/back/other navigation also does not invalidate the request because cleanup only clears the timer.

The new stale-navigation test is weaker than its name: cancellation happens during `handleOpenQuiz`'s initial 100 ms delay, before `fetchQuizDetailsBySessionId` starts, so it does not verify a late in-flight fetch response.

Required closure: make navigation success observable or use the supplied adapter first, pass web navigation, invalidate on actual screen departure, and test a genuinely started deferred fetch plus web/ref-not-ready behavior.

## P2 / nits

- The branch is not type-check clean. The recorded `tsc-current.txt` includes newly exposed cleanup issues such as unused `CreateDocumentQuizScreen` in `App.tsx` and unused `selectedText` in `quizLogDataBuilder.ts`. The repository has many baseline failures, so changed-file errors should at least be removed or explicitly baselined.
- `git diff --check origin/main` reports trailing whitespace in the stabilization handoff.
- `isAttemptAnswerIdentityV1` validates only `version` and that `questions` is an array. Persisted/network data should be structurally validated before nested fields are trusted.
- The open-quiz routing test accepts and navigates to an empty quiz (`questionCount: 0`), which should be explicitly justified or rejected before `QuizTakingScreen`.

## What was verified as solid

- Focused Jest run passed: 7 suites / 30 tests covering answer mapping, log-only reopen, contradiction quarantine, open-quiz routing/guard, saved-books extraction helper, document question normalization, and legacy result normalization.
- For distinct option text, the Swachh Bharat A-selected/B-correct case remains stable through the new log-only identity path.
- Contradictory explanation body sections are hidden when a verified persisted key is supplied.
- Document upload normalization no longer fabricates `A` for missing/invalid answer keys and supports the tested nested `questions.quizzes` shape.
- Open-quiz generation checks are placed after the major awaited operations, so a newer request/cancel can suppress many stale continuations.
- Camera image-size/compression work is bounded, and late home-screen post-capture work is suppressed after the explicit processing timeout.
- Document navigation is more consistently routed to `DocumentUploadHomeScreen`, and the iOS associated-domain/deep-link host additions are internally consistent.

## Independence statement

This is an independent review of the full Draft PR #27 scope—committed branch changes plus the current uncommitted/untracked closure changes—against `origin/main`. It is not a rubber-stamp of the implementing agent's handoff, test claims, or stated diagnoses; production call paths and test blind spots were checked separately.
