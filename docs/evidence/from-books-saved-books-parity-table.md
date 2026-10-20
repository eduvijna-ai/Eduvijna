# Document Assessment → From Books parity (PR #26)

Web reference: **Quiz-React `origin/main` `21f9a1d`** (PR #326 class-10 rebind), file mode in `HandwrittenWorkspace.tsx` + `ContentService` + `savedBooksCurriculumSemantic.ts`.

Deployed `dev.eduvijna.com` bundle `/assets/index-DViZVYNK.js` still contains the pre-PR-326 empty-refinements copy (“selected curriculum unit will still be used for retrieval”) and does not contain the PR-326 topic-gate strings. **API contracts** (`saved-books/*` query keys and `POST /saved-books/generate`) match both revisions. Mobile implements **origin/main 21f9a1d** as specified (saved-books BCS retained while ON, label→catalogue rebind, version/unit gates).

Mobile implementation: PR #26 branch `integration/mobile-founder-acceptance-20261011`.

Live capture account: `demo_samatha` / school **7** (sending `school_id=6` 403s: “Requested school_id does not match authenticated school context”). Redacted JSON: `docs/evidence/from-books-saved-books-live-capture.json`.

| Area | Web (21f9a1d) | Mobile | Evidence |
| --- | --- | --- | --- |
| Source tab | From Upload / From Books | From Upload (camera, gallery, library preserved) / From Books | `DocumentUploadHomeScreen` |
| Alignment OFF dropdowns | `GET /api/v1/content/saved-books/{boards,classes,subjects,topics,subtopics}` with `school_id`, `board_id`, `class_id`, `subject_id`, comma `topics` | Same builders | Live 200: boards CBSE `id=1`, Class 10 `id=22` & `id=14`, Mathematics `id=13`, topics COORDINATE GEOMETRY / TRIGONOMETRY |
| IDs vs labels | Numeric saved-books IDs distinct from catalogue codes | Same; generate OFF sends `board_id`/`class_id`/`subject_id` + names | OFF payload in live capture |
| Class display | `Class 10` → `Class 10 (X)` when grade token 10 | `formatSchoolGradeDocumentLabel` | Semantic tests |
| Dependent reset | Board change clears class/subject/topics | Immediate clear + cancelled fetches | Screen integration test |
| Cache/prefs | School-scoped dropdown cache; session prefs | Account+school scoped in-memory prefs/cache | `buildSavedBooksCacheKey` |
| Custom topics | Multi-select labels + “Add custom topic/sub topic” | Same | Screen custom inputs |
| Language / difficulty / count | 10 languages; easy/medium/hard/**mixed**; 5/10/15/20; default count 5 | Same | Screen |
| Additional instructions OFF | Required; default `summary`; always sent trimmed | Same | `fileFormValidationErrors` + OFF payload |
| Alignment ON catalogue | `GET /curriculum/catalog?current_only=true`; version auto-select if unique current; `resolve-by-codes` units | Same | Live catalog CBSE / 10 / mathematics / 2026-27 |
| ON rebind | `bindSavedBooksSelectionToCatalog` (Class 10 ≡ Class X → `grade_code=10`) | Ported | Semantic tests |
| ON units vs refinements | Unit/chapter is curriculum identity; topics optional via `curriculum-refinements` with repeated `topic` | Same; unique title preselect only if exactly one unit matches | Live refinements 200 for MATH-X-I |
| Generate endpoint both modes | `POST /api/v1/content/saved-books/generate` + `Idempotency-Key` | Same; **not** `/quiz/generate` or `/quiz/generate-curriculum` | Contract tests + live POST |
| OFF payload | `generation_type`, ids/names, topics/subtopics, language, difficulty, `num_questions`, `additional_instructions`, `school_id`, `format_type` | Same (`katex` for Mathematics) | Live OFF payload |
| ON payload | `generation_type`, topics/subtopics, language/difficulty/count, omit empty instructions, `school_id`, `curriculum_context` (codes). No `board_id` fallback | Same | Contract test + live ON payload |
| Job lifecycle | Immediate result or 202 + trusted status poll + `school_id` + cancel + abort seq | Ported | Jest job tests; live ON 202→persisted |
| ON verification | Missing `assessment_intelligence` is failure; zero quiz + delivery metadata → verification failed | Same | Screen test rejects unverified ON |
| Preview handoff | Existing generated-content screen; no default-to-A grading | `sanitizeQuizQuestions` + `resolveCorrectOptionIndex`; preserves option identity + verification fields | Handoff integration test |

## Live generate (dev-api, school 7)

| Mode | Selection | Result |
| --- | --- | --- |
| OFF | CBSE / Class 10 (`22`) / Mathematics / COORDINATE GEOMETRY / 5 / medium / summary | **200**, 5 questions, options present, correct answers present |
| ON | `curriculum_context` MATH-X-I Number Systems | Job **failed** (no matching saved-book unit content). Did not fall back to OFF numeric generate |
| ON | MATH-X-III Coordinate Geometry | **202 → persisted**, 5 questions, `assessment_intelligence.alignment_status=curriculum_mapped` |

## Expo web / Android UI generate

Metro **8082** is already the PR #26 worktree dev-client (not restarted). Full tap-through Generate Assessment on Android emulator and Expo web is **not claimed in this pass**; live API generate above used the same payloads the UI builders emit. Remaining: in-app OFF/ON Generate on device/web after Metro reload of this SHA.

## Not in this pass

Analytics founder automation (kept open). Other PR #26 acceptance gates unchanged.
