# From Books — field / action parity (PR #26)

| Web (Quiz-React HandwrittenWorkspace / document-quiz) | Mobile implementation | Tested |
| --- | --- | --- |
| Tab: From Books (library catalogue) | `DocumentUploadHomeScreen` tab **From Books** → `DocumentCurriculumFromBooksScreen` | Unit + manual |
| Curriculum Alignment OFF | Switch **OFF** → `generateRegistryCurriculumQuiz` (`/api/v1/quiz/generate-curriculum`) | `curriculumAssessment.alignment.test.ts` |
| Curriculum Alignment ON | Switch **ON** → version selector + `generateCurriculumQuiz` (`/api/v1/quiz/generate` + `curriculum_context`) | `curriculumAssessment.alignment.test.ts` |
| Board / Class / Subject chips | Chip rows (catalog API) | Screen |
| Version (alignment ON) | `deriveVersionOptions` + Version chip row | Unit |
| Topics / units (multi OFF, single ON) | Unit list; single-select when alignment ON | Screen |
| Question count & difficulty | COUNT_OPTIONS / LEVELS | Screen |
| Preview after generate | `DocumentUploadPreviewScreen` | Existing flow |
| Save / history / reopen | `DocumentUploadHistoryScreen` + `loadDocumentAssessmentHistory` | `documentAssessmentHistory.service.test.ts` |
| Duplicate From Books banner | Embedded mode: toolbar only (no second title) | UI |
| Uploaded library link | History + `DocumentUploadHistoryScreen` | Navigation |
