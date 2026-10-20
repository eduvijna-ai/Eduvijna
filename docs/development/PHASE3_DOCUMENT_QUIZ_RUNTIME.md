# Phase 3 — Document quiz runtime (mobile)

Branch: `feat/mobile-phase3-document-quiz-runtime` (stacks on PR #19).

## Scope

- Route `/document-quiz` and legacy `CreateDocumentQuizScreen` to the **document-upload workspace** (`DocumentUploadHomeScreen` → preview → quiz → history).
- **From Books** entry via `DocumentLibraryScreen` (server study materials).
- Optional legacy board/medium/chapter UI remains in the unused legacy screen file but is not reachable from navigation tiles.
- Sharing / classroom assignment continues through existing `ShareQuizModal` (`session_id` = assignment scope).

## Verification

| Check | Command |
|-------|---------|
| Nav mapping | `npm test -- quizNavDocumentQuiz` |
| Assigned quiz (Phase 1) | inherited Jest suites on stack base |
| Live submission matrix | `node scripts/dev-api-submission-matrix.mjs` with `.dev-api-credentials.local.json` |
| Bundle | `npm run bundle:verify:development` |

## Limitations

- Live disposable quiz + `demo_aarya` assignment requires gitignored dev credentials; output is `docs/development/e2e-fixtures/submission-matrix-redacted.json`.
- Founder emulator E2E checklist is deferred until Phases 3–6 runtime PRs are merged and reviewed.
