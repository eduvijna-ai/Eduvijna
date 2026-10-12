# PR #26 founder requirements — engineering acceptance (runtime)

**Runtime target (single):** worktree Metro port **8082**, web URL `http://localhost:8082` (`scripts/lib/engineering-runtime-target.mjs`).

| Requirement | Implementation | Fixing commit | Android runtime | Expo web runtime | Evidence / blocker |
| --- | --- | --- | --- | --- | --- |
| Normal instructor login | Preserved (`android-login.mjs`, `web-ui-journey.mjs`) | e83b0d4 | Pass (prior evidence; not re-run) | Pass | `docs/evidence/login-milestones-sanitized-instructor.json`, `web/login-instructor.png` |
| Normal student login | Preserved | e83b0d4 | Pass (prior evidence) | Pass | `web/login-student.png` |
| Teacher result identity (quiz/session/classroom/attempt) | `quizResultRetrieval.service.ts` strict assignment pick + classroom forward | _pending push_ | N/A (unit) | N/A (unit) | `quizResultRetrieval.test.ts` 14 cases |
| Assessments → quiz **479** / student **70** / attempt **207** | Trace + search + root-stack nav | e83b0d4 + _pending_ | **Pass** (journey A warm) | **Pass** (journey A) | `android-journeys/journey-a.json`, `web-journeys/journey-a.json` |
| Analytics → same result | Journey B runner | _pending_ | **Fail** — `analytics_class_selection` (class card not located on hub) | **Fail** — analytics navigation timeout | `journey-b.json` |
| Saved worksheet review (60%, 10 items, 6 correct, answers) | Attended `items` + attempt-scoped metrics | _pending_ | Pass on result screen (A) | Pass on result screen (A) | UI shows 60%, 6/10, Q1+; verifier uses 6/10 denominator |
| Cold launch reliability | `--cold` on journey runner | _pending_ | A reached result after cold bootstrap; metrics verifier fixed post-cold | Not run | Re-run `android-founder-journeys.mjs a --cold` after push |
| Books alignment OFF/ON + preview/save/history | Not completed this pass | — | Not verified | Not verified | **Product gap** — no `Alignment` controls found under `document-upload/` |
| Math/Markdown educational content | Not completed this pass | — | Not verified | Not verified | **Product gap** |
| API-assigned module visibility / deep-link guards | Not completed this pass | — | Not verified | Not verified | **Product gap** |
| Answer option identity (gen → review) | Partial via result normalization | _pending_ | Exercised on A result | Exercised on A result | Needs cross-surface audit |
| Document History / Recent Completions + account switch | Not completed this pass | — | Not verified | Not verified | **Product gap** |

**READY FOR FOUNDER EMULATOR E2E:** **No** — Analytics journey B and listed product workflows remain open.
