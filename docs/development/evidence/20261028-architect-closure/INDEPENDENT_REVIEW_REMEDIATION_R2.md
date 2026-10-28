# Remediations for re-review (Request changes at 0eef272)

Source: `INDEPENDENT_REVIEW_PR27_REREVIEW.md`

| Finding | Fix |
|---------|-----|
| P0-1 inline score/color text-only | `calculateResults` prefers `questionResults` + index-aware `isQuizAnswerCorrect`; option coloring passes `index` |
| P0-2 unvalidated identity | Structural `isAttemptAnswerIdentityV1`; alignment via `isAnswerIdentityAligned`; try/catch + attended fallback; misaligned/malformed tests |
| P1-1 questions service tests | `generateFromSavedBooks` sync + job `questions` cases |
| P1-2 no-key accordion test | Added quarantine test without `correctAnswer` |
| P1-3 blur + catch/finally | Home focus cleanup + guarded catch/finally; Preview focus blur invalidates op id |
| P1-4 late fetch proof | Cancel only after `fetchQuizDetailsBySessionId` has started |

Focused Jest after R2: **8 suites / 44 tests PASS**.
