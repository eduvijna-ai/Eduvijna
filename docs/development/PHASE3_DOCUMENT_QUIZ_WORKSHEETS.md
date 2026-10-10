# Phase 3 — Assessments & worksheets (document quiz / From Books)

Branch: `feat/mobile-phase3-document-quiz-worksheets-docs` (stacks after PR #19).

## Reference surfaces

| Surface | Deployed web | Mobile target |
|---------|--------------|---------------|
| Document quiz workspace | [dev.eduvijna.com/document-quiz](https://dev.eduvijna.com/document-quiz) | Align generation + assignment flows with existing mobile create screens |
| Quiz-React routes | `DocumentQuizPage.tsx`, `HandwrittenWorkspace.tsx` (`/document-quiz`) | No Quiz-React code changes |
| From Books | `HandwrittenWorkspace` source mode `books` + `DocumentQuizCurriculumControls` | Map to mobile document/handwritten quiz entry points |
| Worksheets | `OpenWorksheetPage.tsx` submission (`quiz-attempts` + `quiz-submissions` + worksheet `log_data`) | Reuse Phase 1 submission orchestration patterns where assignment-scoped |

## API scope (existing dev-api only)

- Quiz generation and assignment endpoints already used by mobile `sharedApi` / teacher share flows.
- Worksheet submit: same dashboard attempt + submission sequence as assigned MCQ (see `MOBILE_QUIZ_REACT_REQUEST_PARITY.md`).
- No new backend contracts in this phase.

## Mobile gaps to close (implementation follow-up)

1. Parity matrix: document-quiz vs mobile `CreateDocumentQuizScreen` / curriculum binding.
2. From Books: saved-books picker and curriculum alignment banner behavior vs web.
3. Student open/submit for worksheet assignments (session_id scoping).
4. Teacher results review for worksheet `log_data.worksheet_answers`.

## Verification

- Jest contracts for any new mappers.
- Founder E2E: create from document path → assign → student submit (deferred with global emulator matrix).

## Status

| Item | Status |
|------|--------|
| Reference doc (this file) | **Done** |
| Mobile implementation | **Pending** next PR |
