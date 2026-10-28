# Independent review remediation (same session)

Source: `INDEPENDENT_REVIEW_PR27.md` (Request changes).

| Finding | Disposition |
|---------|-------------|
| P0-1 Duplicate-text grading by text | **Fixed** — index-aware grading through `isQuizAnswerCorrect` / local reconcile / identity freeze; QuizTakingScreen passes indices; duplicate first/second `isCorrect` asserted |
| P0-2 Attended reopen ignores identity questions | **Fixed** — `normalizeAttendedQuizResponse` prefers `answer_identity` frozen model before `items` |
| P1-1 saved-books rejects `questions` | **Fixed** — legacy result guard + type accept `questions` |
| P1-2 Explanation trusted without verified key | **Fixed** — accordion quarantines body when no persisted key |
| P1-3 Camera unmount / Preview | **Fixed** — Home + Preview op-id invalidate on unmount; Preview add-page guards |
| P1-4 Loading cancel fallback / web nav | **Fixed** — prefer screen `navigation` prop; web shell passes navigation; unmount cancels open-quiz request |
| P2 tsc delta | main baseline **219** errors → branch **217** (`tsc-delta.txt`); not clean, not dismissed without evidence |

Independent review is **not** re-approved by the implementer. Re-review of the remediating commit is recommended.
