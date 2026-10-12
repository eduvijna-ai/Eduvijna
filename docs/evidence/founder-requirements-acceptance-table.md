# PR #26 founder requirements — engineering acceptance (runtime)

**Runtime target (single):** worktree Metro port **8082**, web URL `http://localhost:8082` (`scripts/lib/engineering-runtime-target.mjs`).

| Requirement | Implementation | Fixing commit | Android runtime | Expo web runtime | Evidence / blocker |
| --- | --- | --- | --- | --- | --- |
| Normal instructor login | Preserved (`android-login.mjs`, `web-ui-journey.mjs`) | e83b0d4 | Pass (prior) | Pass (prior) | `docs/evidence/login-milestones-sanitized-instructor.json` |
| Normal student login | Preserved | e83b0d4 | Pass (prior) | Pass (prior) | `web/login-student.png` |
| Teacher result identity | `quizResultRetrieval.service.ts` | 13521e6 | N/A (unit) | N/A (unit) | `quizResultRetrieval.test.ts` |
| Journey A Assessments → 479 / 70 / 207 | Trace + root-stack nav | 13521e6 | **Pass** (prior warm) | **Pass** (prior) | `journey-a.json` |
| Journey B Analytics → saved result | Academic-year default dates; scoped testIDs; `QuizResultsScreen` from analytics; trace script | _this commit_ | **Fail** (class hub / drill flaky on emulator; reached View Analytics in one run) | **Fail** (analytics hub timeout) | `scripts/analytics-fixture-trace.mjs`, `journey-b.json` |
| Result verifier (identity + Q/A) | `quiz-result-summary` a11y; API snippets in `founder-fixture.mjs`; scoped metrics | _this commit_ | Partial (identity needs fresh bundle) | Partial | `android-journey-logic.mjs` |
| Analytics API includes fixture 479 | Default `created_from` Aug 1 academic year | _this commit_ | N/A | N/A | `analytics-trace`: narrow range excludes 479; wide includes |
| Books alignment OFF/ON + preview/save/history | `DocumentCurriculumFromBooksScreen` exists; alignment toggle not ported from web | — | Not verified | Not verified | **Product gap** |
| Math/Markdown surfaces | `MathRenderer` on `QuizResultsScreen` Q/options | _this commit_ | Not re-run | Not re-run | Partial coverage |
| `quiz-navigation-items` / deep links | `QuizGenerationGrid` + `useQuizNavItems` (existing) | prior | Not verified this pass | Not verified | **Needs dedicated E2E** |
| New assessment option identity | Not exercised this pass | — | Not verified | Not verified | **Product gap** |
| Document history / Recent Completions | Not implemented this pass | — | Not verified | Not verified | **Product gap** |
| Cold launch (no data clear) | Runner `--cold` | 13521e6 | Not re-run this pass | — | Prior A cold evidence |

**READY FOR FOUNDER EMULATOR E2E:** **No** — Journey B not green on both platforms; Books alignment, modules E2E, new-assessment grading, and history/completions remain open.

**Release gates (unchanged):** physical-device push separately unverified; founder emulator E2E blocked on engineering acceptance above.
