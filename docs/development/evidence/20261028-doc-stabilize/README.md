# 2026-10-28 Document Assessment P0 evidence

## Issue 2 — Page preview unavailable

**Root cause:** page-image request keys stayed marked in-flight/succeeded after cancel; thumbnails loaded before focused medium; no doc-scoped request identity.

**Fix (mobile):** `bookPageImageSession.ts` tracker (inFlight vs succeeded), focused-medium-first + bounded thumbnail concurrency; Preview + BookPageViewer wired.

**Live evidence (food.pdf `4f72a789-0b27-4c73-ac26-cb1ff6d93c82`):**

| Check | Result |
| --- | --- |
| Emulator pages 1–5 cycle | PASS — no "Page preview unavailable" |
| API `GET .../pages/{1-5}/image?size=medium` | PASS — HTTP 200, PNG magic `89 50 4E 47`, ~1.1–1.2 MB each |
| Cached local medium/mini files | Present for pages 1–5 |

`DOCUMENT_PREVIEW_READY=true`

## Issue 1 — Assessment generation returns no questions

**Root cause (not mobile request shaping):** live `POST /api/v1/study-materials/generate-from-book` with correct `doc_id`, `page_numbers`, `difficulty=4` returned HTTP 200:

```json
{
  "success": true,
  "request_id": "c863d3e2-d31e-4ca3-a3e5-0a7f5f831dd9",
  "questionArrayLength": 0,
  "rawContentLength": 553,
  "pipelineStages": ["files_ingested","blocks_extracted","concepts_normalized"],
  "docId": "4f72a789-0b27-4c73-ac26-cb1ff6d93c82",
  "pageNumbers": [1,2,3,4,5],
  "difficulty": "4"
}
```

Direct API probe (1 page): `concepts_normalized: 0`, `raw_content_len: 105`, `total_questions: 0`, still `success: true`.

Normalization LLM can return `[]` without falling back to raw blocks; generation then runs on empty concepts; pipeline still reported success.

**Mobile hardening:** web-parity difficulty (`medium→4`), `language: en`, broader `extractQuestionsPayload`, redacted empty-generation diagnostics, clearer thin-extraction error copy.

**Backend fix (owning repo):** branch `fix/generate-from-book-empty-questions-20261028` on `eduvijna-ai/eduvijna-api` — empty-concept fallback + `success:false` when zero validated questions. Requires approved **development** deploy before re-verification.

`DOCUMENT_GENERATION_READY=false` until post-deploy live generate returns questions.

## Flags

| Flag | Value |
| --- | --- |
| DOCUMENT_PREVIEW_READY | true |
| DOCUMENT_GENERATION_READY | false (blocked on API deploy) |
| READY_FOR_FOUNDER_EMULATOR_TESTING | false (generation not closed) |
| MOBILE_CODE_READY_TO_MERGE | false (generation + independent review pending) |

## Jest (focused)

See `jest-focused.txt` — image session / regenerate / crop lifecycle suites PASS.
