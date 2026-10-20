# Assessment consistency matrix (focused audit)

**Product SHA:** `ce3fb54f9111c6aa11cd1c5df36e722c06aaabb7`  
**API:** `https://dev-api.eduvijna.com`  
**Physical device checks:** pending (not executed)

## Population boundaries (preserved)

| Population | Meaning | Not interchangeable with |
| --- | --- | --- |
| Authorized classrooms | Student `view_type=classes` / teacher `class_wise_students` inventory | Quiz-derived unique class names |
| Assigned/shared assessments | Student/teacher assignment lists | Generated history-only items |
| Generated assessments/history | Document/handwritten saved assessments | Auto-assigned student attempts |
| Student attempts / saved results | Personal completion rows | Teacher cohort submission totals |

## Document Assessment generation contracts

| Entry | Role | Sequence | Notes |
| --- | --- | --- | --- |
| Camera/Gallery Document Assessment | Instructor | Selected current images → PDF (`saveImagePagesAsLibraryBook`) → `waitForLibraryBookReady` → `generateFromBook` with pages `1..N` | Live verified 2026-10-19 (`camera-document-assessment-live.json`) |
| Library / From Books | Instructor | Existing `doc_id` → `generateFromBook` | Unchanged |
| Instant PDF upload (non-camera) | Instructor | `generateMultimodalAssessmentFromDocument` | Unchanged |
| Handwritten Extract | Instructor | `batch-ocr-upload` → generate-strict | **Deferred** — Mathpix 503 on shared backend |

## Surface matrix

| Surface | Role | Entity | Endpoint / source | Filters | Count contract | Status contract |
| --- | --- | --- | --- | --- | --- | --- |
| Home Classes KPI | Student | Classroom | Shared `assessmentClassrooms` (`classes`) | School/account scope | Unique `classroom_id` | n/a |
| ClassesList | Student | Classroom | Same inventory | Same | Same IDs | n/a |
| Assessments classroom options | Student | Classroom | Same inventory | Same | Same IDs | Personal attempt status |
| Analytics class cards | Student | Classroom | Inventory ∪ `student_total_details` metrics | Date range on metrics only | Inventory membership; empty classes stay | Personal Completed/Pending; Avg `—` when no numeric scores |
| Home / ClassesList | Teacher | Classroom | `class_wise_students` inventory | Scope | Unique IDs | Availability Active/Upcoming/Expired on Assessments |
| Analytics class cards | Teacher | Classroom | Inventory ∪ teacher metrics | Date on metrics | Inventory membership | Class-card Completed/Pending ungated; drill Pending active-gated |

## Screenshot Avg 0% with Completed > 0

**Cause:** class-card `avg_score` defaulted to `0` when completed rows lacked numeric scores.  
**Fix:** `avg_score: null` when `scoreCount === 0`; UI shows `—`.

## Role verification availability

| Role | Verified in this pass |
| --- | --- |
| Student inventory/analytics merge | Code + unit tests (prior) |
| Teacher inventory/status | Preserved prior suites |
| Instructor camera Document Assessment | Live API upload→generate→save→reopen |
| Parent / other | Unavailable |

## Mathpix (Handwritten only)

Handwritten OCR provider gate remains an explicit backend blocker. Camera Document Assessment no longer depends on Mathpix.
