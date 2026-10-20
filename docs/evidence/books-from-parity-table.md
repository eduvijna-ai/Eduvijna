# From Books — field / action parity (PR #26)

Evidence runs use Metro **8082** with `node scripts/verify-engineering-bundle.mjs` (`curriculum-generated-preview-v1` in bundle) before UI journeys.

| Web (Quiz-React HandwrittenWorkspace) | Mobile | Contract / evidence |
| --- | --- | --- |
| Tab: From Books (curriculum catalogue) | `DocumentUploadHomeScreen` → **From Books** → `DocumentCurriculumFromBooksScreen` | Screen + catalog API |
| Alignment **OFF** | Switch OFF; `getCurriculumCatalog(current_only=true)`; `generateRegistryCurriculumQuiz` → `POST /api/v1/quiz/generate-curriculum` with `topic`, `subtopic`, `itext` (required), `language`, `count`, `level` | `curriculumAssessment.alignment.test.ts`; manual OFF generate → `DocumentCurriculumGeneratedPreviewScreen` |
| Alignment **ON** | Switch ON; `getCurriculumCatalog(current_only=false)` for version list; single unit; `generateCurriculumQuiz` → `POST /api/v1/quiz/generate` + `curriculum_context` | `curriculumAssessment.alignment.test.ts`; version required validation on screen |
| Language | Chip row `en` / `hi` / `te` → `language` on both APIs | Screen `testID` language chips |
| Additional instructions | Required when OFF (web file panel); optional when ON → `itext` / `input_text` | `curriculum-additional-instructions` |
| Subtopics (OFF) | Comma-separated → `subtopic` on registry API | `curriculum-subtopics` |
| Board / class / subject | Chip rows from catalog | Screen |
| Version (ON only) | `deriveVersionOptions` + chip row | Resets on alignment toggle |
| Topics / units | Multi-select OFF; single ON | `toggleUnit` |
| Question count & difficulty | COUNT_OPTIONS / LEVELS | Screen |
| Generated preview (no uploaded book) | `DocumentCurriculumGeneratedPreviewScreen` + `documentCurriculumGeneratedHandoff.ts` | `documentCurriculumGeneratedHandoff.integration.test.tsx` (params + render) |
| Save on preview | Auto `saveUserAssessment` on mount; **Open assessment** → `DocumentUploadQuizScreen` | Integration test mocks save; full save/reopen: _pending Android/web run log_ |
| Worksheet (aligned) | **Generate worksheet** on preview → `generateWorksheet` → `WorksheetScreen` | Gated when alignment OFF |
| History / reopen | `DocumentUploadHistoryScreen` → `getUserAssessmentById` → quiz/worksheet routes (no `book` param) | `loadDocumentAssessmentHistory.service` tests; E2E reopen: _pending run log_ |
| Duplicate From Books banner | Embedded toolbar only | UI |
| Web saved-books library OFF path | Mobile catalogue tab is **not** `generateFromSavedBooks`; upload tab covers library books | Documented gap vs web file-panel OFF |

## Save → history → reopen checklist (record per mode)

| Step | Alignment OFF | Alignment ON | Android run | Web run |
| --- | --- | --- | --- | --- |
| Generate | | | _TODO_ | _TODO_ |
| Preview questions/options/explanations | | | _TODO_ | _TODO_ |
| Save (auto) | | | _TODO_ | _TODO_ |
| History list | | | _TODO_ | _TODO_ |
| Reopen quiz | | | _TODO_ | _TODO_ |
