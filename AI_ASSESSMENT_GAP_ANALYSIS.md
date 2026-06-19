# AI Assessment Gap Analysis
**Web (Quiz-React) vs Mobile (Eduvijna)**

Generated: June 19, 2026  
Analyst: Senior React Native + React.js Engineer  
Source of Truth: `Quiz-React/src/components/HandwrittenWorkspace.tsx` + `WebQuizPage.tsx`

---

## Table of Contents

1. [Current Web Flow](#1-current-web-flow)
2. [Current Mobile Flow](#2-current-mobile-flow)
3. [Screen Gap Analysis](#3-screen-gap-analysis)
4. [Feature Gap Analysis](#4-feature-gap-analysis)
5. [API Gap Analysis](#5-api-gap-analysis)
6. [Payload Differences](#6-payload-differences)
7. [Validation Differences](#7-validation-differences)
8. [State Management Differences](#8-state-management-differences)
9. [Navigation Flow Differences](#9-navigation-flow-differences)
10. [Missing Loading States](#10-missing-loading-states)
11. [Missing Error Handling](#11-missing-error-handling)
12. [Missing UI States](#12-missing-ui-states)
13. [Component Gap Analysis](#13-component-gap-analysis)
14. [Recommended Implementation Plan](#14-recommended-implementation-plan)

---

## 1. Current Web Flow

### Entry Point
`HandwrittenWorkspace.tsx` is the unified hub for all AI assessment workflows on web.  
`WebQuizPage.tsx` is a standalone AI quiz page (also used in some routing contexts).

### Workspace Modes (5 total)

| Mode | Route | Description |
|------|-------|-------------|
| `ai-assessment` | `/web-quiz` | Prompt-based AI quiz generation |
| `document-assessment` | `/handwritten` | Book search or instant file upload → generate from pages |
| `image-assessment` | `/image-quiz` | Image-based assessment (ImageAssessmentWorkspace) |
| `youtube-assessment` | `/youtube-quiz` | YouTube video-based assessment (YouTubeAssessmentWorkspace) |
| `exam-paper` | `/pdf-extraction` | Exam paper scanning and processing (ExamPaperWorkspace) |

> Mode visibility is role-based: controlled by `useQuizNavContext` (navItems) and `allowedWorkspaceRoutes`.

### AI Assessment Mode (Web – Most Detailed)

**Left Panel (Sidebar):**
- Collapsible "Recent Quizzes" section — loads via `GET /api/v1/user-assessments?assessment_type=web-quiz&source=AIQuiz`
- Collapsible "Recent Worksheets" section — loads via `GET /api/v1/user-assessments?assessment_type=worksheet&source=Worksheet`
- Collapsible "Recent Summaries" section
- Search + class/subject filter on sidebar list
- Click a saved quiz → restore quiz with response-restoration prompt

**Center Panel:**
- Tabs: `Quiz` | `Worksheet` | `Summary`
- Quiz tab: renders `QuizTab` component (self-contained question player with verify/submit)
- Worksheet tab: renders `WorksheetTab` component (inline worksheet display)
- Summary tab: renders `TopicSummaryModal`

**Right Panel (Form):**
- Toggle: General | Competitive
- **General fields:** Class (dropdown), Subject (dropdown, depends on Class), Lesson (text), Sub-Lesson (text), Topic (text), Language (dropdown), Difficulty Level (dropdown), Question Count (1–30 slider), Additional Instructions / itext (textarea, optional)
- **Competitive fields:** Stream (dropdown), Exam (dropdown, depends on Stream), Category (dropdown), Subject (dropdown, depends on Exam), Topic (text, required), Language (dropdown), Difficulty Level (dropdown), Question Count, itext (textarea, optional)
- Dropdowns loaded from `/api/v1/dropdowns/*` with school_id context
- Generate button → AI generation → auto-save → update sidebar

**AI Generation (General):**
```
POST /api/v1/quiz/generate
{
  "class": "Class 10",
  "subject": "Physics",
  "lesson": "Optics",
  "topic": "Refraction",       ← optional but passed
  "language": "en",
  "level": "intermediate",
  "count": 10,
  "itext": ""                  ← optional, no validation
}
```

**AI Generation (Competitive):**
```
POST /api/v1/quiz/generate-exam-assessment
{
  "exam": "JEE",
  "count": 10,
  "itext": "",
  "stream": "engineering",
  "category": "Science",
  "subject_requirement": "Any Stream",
  "subject": "Physics",
  "topic": "Thermodynamics",
  "level": "Advanced",
  "input_text": "jee",
  "language": "en"
}
```

**Auto-Save after generation:**
```
POST /api/v1/user-assessments
{
  "title": "Physics - Optics",
  "subject": "Physics",
  "class_name": "Class 10",
  "level": "Intermediate",
  "lesson": "Optics",
  "questions": [...QuizData[]],
  "assessment_type": "web-quiz",
  "school_id": 5,
  "source": "AIQuiz"            ← IMPORTANT: "AIQuiz" for general, "AIQuiz" for competitive too
}
```

**Response Persistence:**
- As user answers questions → auto-saves via `PUT /api/v1/user-assessments/:id/responses { responses: {...} }`
- When loading a saved quiz with existing responses → popup asks "Restore previous responses?" (Yes/No)

**Explanation Editing:**
- Each question has an editable explanation field
- `PATCH /api/v1/user-assessments/:id/questions/:idx/explanation { explanation: "..." }`

**Worksheet Generation (from AI context):**
- Button in Quiz panel → opens modal → select question types + counts
- `POST /api/v1/worksheet/generate` with class/subject/lesson/level/itext/counts
- Auto-saves: `POST /api/v1/user-assessments` with `assessment_type: 'worksheet'`, `source: 'Worksheet'`

**Topic Summary:**
- Button → opens `TopicSummaryModal` component

**Share Quiz:**
- Select questions → `ShareQuizPopup` → generates session URL → `ShareOptionsPopup`

---

### Document Assessment Mode (Web)

**Two tabs:**
- **Book Search**: Filter/search uploaded books from server → select book → click pages to select → Generate
- **Instant Upload**: Drag-drop or select files → Preview pages → select pages → Generate

**Left Panel APIs:**
```
GET /api/v1/pdf-questions/files?source=Document[&search=...]    → list uploaded books
GET /api/v1/study-materials/filters                              → filter options (grade, subject, lesson)
DELETE /api/v1/study-materials/books/:docId                     → delete a book
```

**Book Upload API:**
```
POST /api/v1/study-materials/books/upload
FormData:
  file        = <PDF file>
  title       = "Optics Chapter"       ← required
  grade_level = "Class 10"
  subject     = "Physics"
  lesson_title = "Optics"
  sub_lesson  = "Refraction"
```

**Page Image Loading (auth-protected):**
```
GET /api/v1/study-materials/books/:docId/pages/:page/image?size=mini|thumbnail|medium|full
Authorization: Bearer <token>
```
→ Returns binary image; web uses `fetch()` + `URL.createObjectURL(blob)` to render.

**Generate from Book (selected pages):**
```
POST /api/v1/study-materials/generate-from-book
{
  "doc_id": "abc123",
  "page_numbers": [1, 2, 3],
  "question_count": 20,
  "difficulty": "mixed",      ← "2" (easy) / "6" (hard) / "mixed"
  "subject": "Physics",
  "grade_level": "Class 10",
  "lesson_title": "Optics"
}
```

**Generate from Instant Upload (files):**
```
POST /api/v1/assessment/generate-multimodal
FormData:
  files[]        = <uploaded files>
  question_count = 20
  difficulty     = "mixed"
  subject        = "Physics"
  grade_level    = "Class 10"
  lesson_title   = "Optics"
```

**Worksheet from Document:**
- Extract raw content first → `POST /api/v1/study-materials/extract-raw-content` or `POST /api/v1/assessment/extract-raw-content`
- Then `POST /api/v1/worksheet/generate` with `type: 'document'`
- Auto-save with `source: 'Doc-Worksheet'`

**History:**
- Quizzes: `GET /api/v1/user-assessments?assessment_type=web-quiz&source=Document`
- Worksheets: `GET /api/v1/user-assessments?assessment_type=worksheet&source=Doc-Worksheet`
- Summaries: `GET /api/v1/pdf-questions/files?source=Document`

---

## 2. Current Mobile Flow

### Entry Points

| Screen | Route | What it does |
|--------|-------|--------------|
| `CreateAIQuizScreen.tsx` | `CreateAIQuiz` | General + Competitive AI quiz form |
| `AssessmentWorkspaceScreen.tsx` | `AssessmentWorkspace` | Document/file-based workspace (tabs: Setup, Quizzes, Worksheets, History) |
| `DocumentUploadHomeScreen.tsx` | `DocumentUploadHome` | Upload file → RAG ingest → navigate to preview |
| `DocumentUploadPreviewScreen.tsx` | `DocumentUploadPreview` | Preview doc pages, select, generate quiz or worksheet |
| `DocumentUploadQuizScreen.tsx` | `DocumentUploadQuiz` | Wrapper that passes quizData to QuizTakingScreen |
| `DocumentUploadHistoryScreen.tsx` | `DocumentUploadHistory` | Combined local + server history view |
| `RecentAssessmentsScreen.tsx` | `RecentAssessments` | Tabs: Recent Quizzes + Worksheets (server-fetched) |
| `CreateDocumentQuizScreen.tsx` | `CreateDocumentQuiz` | Legacy document quiz screen (RAG + /quiz/generate) |
| `CreateImageQuizScreen.tsx` | `CreateImageQuiz` | Image capture → /analyze-image → /quiz/generate |
| `CreateHandwrittenQuizScreen.tsx` | `CreateHandwrittenQuiz` | Handwritten notes → quiz |

### AI Assessment Flow (Mobile – CreateAIQuizScreen)

**Form fields (General):** Class, Subject, Lesson, Sub-Lesson, Topic, Language, Difficulty Level, Count, Additional Instructions (itext)  
**Form fields (Competitive):** Stream, Exam (depends on Stream), Category, Subject (depends on Exam), Topic, Language, Difficulty Level, Count, itext

**On Generate:**
1. Validates (itext is **required** – blocking validation)
2. Calls `generateAIQuiz` or `generateCompetitiveAIQuiz` from `sharedApi.ts`
3. On success → `navigation.replace('QuizTakingScreen', { quizData, ... })`
4. After navigate → saves to `/api/v1/user-assessments` with `assessment_type: 'quiz'`, `source: 'General'` / `'Competitive'`

**What is missing vs web:**
- No history sidebar within the screen
- No worksheet generation from this screen
- No topic summary
- No response restoration
- No share popup within this screen (handled in `QuizTakingScreen`)

### Document Assessment Flow (Mobile – DocumentUpload stack)

**DocumentUploadHomeScreen:**
1. User picks file or takes photo
2. `POST /api/v1/rag/ingest-pdf` (multipart: `file`, `title`, `description`) ← **different endpoint than web**
3. Saves book info locally in AsyncStorage (`DocumentUploadBook`)
4. Navigates to `DocumentUploadPreviewScreen`

**DocumentUploadPreviewScreen:**
1. Shows uploaded doc reference; select page range + difficulty + count
2. Generate quiz: `POST /api/v1/assessment/generate-multimodal` ← same as web instant-upload
3. Generate worksheet: `POST /api/v1/worksheet/generate`
4. Save: `POST /api/v1/user-assessments`
5. Navigate to `DocumentUploadQuizScreen` or `WorksheetScreen`

**DocumentUploadHistoryScreen:**
- Loads from AsyncStorage (local books)
- Also fetches: `GET /api/v1/user-assessments` (all, not filtered)

### Assessment Workspace (Mobile – AssessmentWorkspaceScreen)

**Tabs:** Setup, Quizzes, Worksheets, History

**Setup tab:** Source selector (File, URL, Camera), AI settings (level, count), Generate button  
**Quizzes tab:** `listUserAssessments()` → filtered list; open → QuizTakingScreen  
**Worksheets tab:** Inline worksheet form + `listUserAssessments(undefined, 'Worksheet')`  
**History tab:** Combined list sorted by date  

---

## 3. Screen Gap Analysis

| Web Screen/Mode | Mobile Equivalent | Status | Gap |
|-----------------|-------------------|--------|-----|
| AI Assessment (unified workspace) | `CreateAIQuizScreen` + `RecentAssessmentsScreen` | Partial | No in-screen history, no worksheet, no summary |
| Document Book Search | None | **MISSING** | No server-side book library/search UI |
| Document Instant Upload | `DocumentUploadHomeScreen` → `PreviewScreen` | Partial | Different API (rag/ingest-pdf vs study-materials) |
| Image Assessment Workspace | `CreateImageQuizScreen` | Partial | Uses different API chain (analyze-image → quiz/generate vs direct) |
| YouTube Assessment | No dedicated screen | **MISSING** | Mobile has `generateYouTubeQuiz` in sharedApi but no screen |
| Exam Paper Processing | None | **MISSING** | Completely absent from mobile |
| Topic Summary | None | **MISSING** | No topic summary feature in mobile |
| Response Restoration Popup | None | **MISSING** | No "restore previous responses" flow |

---

## 4. Feature Gap Analysis

### 4.1 AI Assessment Mode

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| General quiz generation | ✅ | ✅ | None |
| Competitive quiz generation | ✅ | ✅ | None |
| Language selection (general) | ✅ | ✅ | None |
| Language selection (competitive) | ✅ | ✅ | None |
| Sub-lesson field | ✅ passed to prompt | ✅ (form field exists) | None in form; web doesn't send to API but has it |
| itext required validation | ❌ (optional) | ✅ (required) | **Mobile over-validates** — blocks users |
| History sidebar | ✅ inline | Separate screen | UX difference; not a blocker |
| Click history → load quiz | ✅ | ✅ | None |
| Response save (answers while taking) | ✅ `PUT /responses` | ❌ | **MISSING** |
| Response restoration popup | ✅ | ❌ | **MISSING** |
| Explanation editing per question | ✅ `PATCH /explanation` | ❌ | **MISSING** |
| Worksheet generation (from AI mode) | ✅ | ❌ in CreateAIQuizScreen; ✅ in AssessmentWorkspaceScreen | Partially available but not in AI flow |
| Topic Summary | ✅ | ❌ | **MISSING** |
| Share quiz (link generation) | ✅ | ✅ (in QuizTakingScreen) | Minor UX difference |
| Delete saved assessment | ✅ | ✅ | None |
| Sidebar search/filter | ✅ class + subject filter | ✅ (in RecentAssessmentsScreen) | None |

### 4.2 Document Assessment Mode

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| Upload book with metadata (title, grade, subject, lesson, sub_lesson) | ✅ `/study-materials/books/upload` | Partial — only `title` + `description` via `/rag/ingest-pdf` | **MISSING sub_lesson, grade_level, subject, lesson_title** |
| Server-side book library (persistent, shared) | ✅ `/pdf-questions/files` | ❌ AsyncStorage only (local, per-device) | **MISSING** |
| Book filter options from API | ✅ `/study-materials/filters` | ❌ | **MISSING** |
| Search/filter uploaded books | ✅ | ❌ | **MISSING** |
| Book page thumbnail strip | ✅ auth-protected images | ❌ no page thumbnails | **MISSING** |
| Select up to 5 pages for generation | ✅ | ❌ (selects page range not individual) | **MISSING** |
| Generate from saved book pages | ✅ `/study-materials/generate-from-book` | ❌ no equivalent | **MISSING** |
| Generate from instant upload | ✅ `/assessment/generate-multimodal` | ✅ same endpoint | None |
| Delete book from server | ✅ `DELETE /study-materials/books/:id` | ❌ | **MISSING** |
| Document history (quizzes) | ✅ `source=Document` filter | ❌ (uses broad fetch) | **MISSING source filter** |
| Document history (worksheets) | ✅ `source=Doc-Worksheet` filter | ❌ | **MISSING source filter** |
| Extract raw content for worksheet | ✅ `/study-materials/extract-raw-content` | ❌ | **MISSING** |
| Worksheet from document | ✅ embedded in workspace | ✅ in DocumentUploadPreviewScreen | Minor UX difference |

### 4.3 Image Assessment Mode

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| Image upload → direct assessment | ✅ via `ImageAssessmentWorkspace` | ✅ `CreateImageQuizScreen` uses `/analyze-image` → `/quiz/generate` | Functionally equivalent |
| Image source: file upload | ✅ | ✅ | None |
| Image source: camera capture | ✅ | ✅ | None |

### 4.4 YouTube Assessment Mode

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| YouTube URL → quiz generation | ✅ `YouTubeAssessmentWorkspace` | ❌ No dedicated screen | **MISSING** — `generateYouTubeQuiz` exists in sharedApi but no UI |

### 4.5 Exam Paper Mode

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| PDF scanning + extraction | ✅ `ExamPaperWorkspace` | ❌ | **MISSING** |

---

## 5. API Gap Analysis

### APIs used in Web but NOT in Mobile

| API Endpoint | Web Usage | Mobile Status |
|--------------|-----------|---------------|
| `POST /api/v1/study-materials/books/upload` | Upload book with full metadata | ❌ Not called; mobile uses `/rag/ingest-pdf` |
| `GET /api/v1/pdf-questions/files?source=Document` | List uploaded books | ❌ Not called |
| `GET /api/v1/study-materials/filters` | Load filter options | ❌ Not called |
| `GET /api/v1/study-materials/books/:id/pages/:page/image?size=` | Page thumbnail images | ❌ Not called |
| `DELETE /api/v1/study-materials/books/:id` | Delete a book | ❌ Not called |
| `POST /api/v1/study-materials/generate-from-book` | Generate quiz from book pages | ❌ Not called |
| `POST /api/v1/study-materials/extract-raw-content` | Extract text for worksheet | ❌ Not called |
| `POST /api/v1/assessment/extract-raw-content` | Extract text from instant-upload | ❌ Not called |
| `PUT /api/v1/user-assessments/:id/responses` | Save user's answers | ❌ Not called |
| `PATCH /api/v1/user-assessments/:id/questions/:idx/explanation` | Update explanation | ❌ Not called |
| `POST /api/v1/worksheet/generate` (from AI mode) | AI-mode worksheet generation | ⚠️ Available in `AssessmentWorkspaceScreen` but not integrated into `CreateAIQuizScreen` |
| `POST /api/v1/ytlink` | YouTube video quiz | ❌ API exists in sharedApi, no UI |

### APIs available in Mobile but NOT in Web

| API Endpoint | Mobile Usage | Notes |
|--------------|-------------|-------|
| `POST /api/v1/rag/ingest-pdf` | DocumentUploadHomeScreen | Web uses `/study-materials/books/upload` instead |
| `POST /api/v1/upload-educational-pdf` | `generatePDFQuiz` in sharedApi | Legacy endpoint, different from web |

---

## 6. Payload Differences

### 6.1 General AI Quiz Save — Critical Difference

**Web saves with:**
```json
{
  "assessment_type": "web-quiz",
  "source": "AIQuiz"
}
```

**Mobile saves with:**
```json
{
  "assessment_type": "quiz",
  "source": "General"   ← or "Competitive"
}
```

**Impact:** `RecentAssessmentsScreen` on mobile fetches with `assessment_type=quiz`, which won't show web-generated quizzes. The web's sidebar lists `assessment_type=web-quiz&source=AIQuiz`. These two systems use incompatible categorization, so history is siloed between web and mobile.

### 6.2 Book Upload Payload Difference

**Web (`/study-materials/books/upload`):**
```
FormData:
  file        = <PDF>
  title       = "Optics Chapter"     ← required
  grade_level = "Class 10"
  subject     = "Physics"
  lesson_title = "Optics"
  sub_lesson  = "Refraction"
```

**Mobile (`/rag/ingest-pdf`):**
```
FormData:
  file        = <PDF/image>
  title       = "Optics Chapter"
  description = "..."
```
Missing: `grade_level`, `subject`, `lesson_title`, `sub_lesson`. These metadata fields are used by the web to auto-populate quiz generation parameters.

### 6.3 Document Generation Payload Difference

**Web generate-from-book:**
```json
{
  "doc_id": "abc123",
  "page_numbers": [1, 2, 3],
  "question_count": 20,
  "difficulty": "mixed",
  "subject": "Physics",
  "grade_level": "Class 10",
  "lesson_title": "Optics"
}
```

**Mobile generate-multimodal:**
```
FormData:
  files[]        = <raw files again>
  question_count = 20
  difficulty     = "medium"
  subject        = "Physics"
  grade_level    = "Class 10"
  lesson_title   = "Optics"
```
Mobile re-uploads raw files every time generation is triggered, whereas web uses `doc_id` to reference already-uploaded books. This is less efficient and re-uploads data unnecessarily.

### 6.4 Difficulty Value Mapping Difference

**Web:**
- `easy` → `"2"` (numeric string)
- `hard` → `"6"` (numeric string)
- `medium` → `"mixed"` (string)

**Mobile:**
- Passes `"easy"` / `"medium"` / `"hard"` directly as strings

This may cause backend issues if the endpoint expects the numeric string format.

---

## 7. Validation Differences

| Validation | Web | Mobile | Issue |
|-----------|-----|--------|-------|
| `itext` (Additional Instructions) | Optional — empty string allowed | **Required** — blocks form submit | Mobile over-validates; users can't generate without instructions |
| `topic` field | Optional | Optional | None |
| Class selection | Required | Required | None |
| Subject selection | Required | Required | None |
| Lesson | Required | Required | None |
| Difficulty Level | Required | Required | None |
| Book title on upload | Required | Required | None |
| Page selection (max 5) | ✅ Enforced (MAX_QUIZ_PAGES = 5) | ❌ Not enforced | Mobile could generate from too many pages |
| Competitive: stream | Required | Required | None |
| Competitive: exam | Required | Required | None |
| Competitive: category | Required | Required | None |
| Competitive: subject | Required | Required | None |
| Competitive: topic | Required | Required | None |

**Critical Fix Needed:** Remove `itext` required validation in `CreateAIQuizScreen.tsx` — make it optional to match web.

---

## 8. State Management Differences

### Web
- All state is local to `HandwrittenWorkspace.tsx` (large monolithic component: ~4295 lines)
- `localStorage` persists tab state via `HW_TAB_STATE_KEY`
- No global store for assessment state

### Mobile
- `CreateAIQuizScreen`: Local component state only
- `AssessmentWorkspaceScreen`: Uses `useAssessmentWorkspaceStore` (Zustand)
- `DocumentUploadHomeScreen`: Uses `AsyncStorage` for local book persistence
- `RecentAssessmentsScreen`: Fetches fresh on mount, local state

**Gap:** Mobile has no equivalent of web's response persistence (`PUT /responses`). The web auto-saves user's in-quiz answers so they can be restored when the same quiz is reopened. Mobile has no such mechanism.

---

## 9. Navigation Flow Differences

### Web AI Assessment Flow
```
HandwrittenWorkspace (tabs) → [AI Mode selected] → Fill form → Generate → Quiz displayed inline
                                                                       ↓
                                                               Quiz Tab auto-switches
                                                               History sidebar updates
```

### Mobile AI Assessment Flow
```
CreateAIQuizScreen → Fill form → Generate → navigation.replace('QuizTakingScreen')
                                             ← User must go Back to see history
```

**Gap:** Web shows quiz inline in the same view; mobile navigates away. This means:
- Mobile user loses form context on navigate
- Mobile user can't switch between recent assessments while viewing quiz
- The `navigation.replace` (not `navigate`) means the user can't go back to the form

### Web Document Assessment Flow
```
HandwrittenWorkspace → [Document mode] → Search books or Instant Upload
   → Select book → Select pages → Generate → Quiz/Worksheet inline
```

### Mobile Document Assessment Flow
```
AssessmentWorkspaceScreen → Tap "Upload File" button → DocumentUploadHomeScreen
   → Pick file → POST /rag/ingest-pdf → DocumentUploadPreviewScreen
   → Select options → generate → DocumentUploadQuizScreen → QuizTakingScreen
```
**Gap:** Mobile has 4-screen deep navigation for document quiz; web is single-view. More complex mobile flow.

---

## 10. Missing Loading States

| Loading State | Web | Mobile |
|--------------|-----|--------|
| Classes dropdown loading | ✅ spinner | ✅ |
| Subjects dropdown loading | ✅ spinner | ✅ |
| Streams loading (competitive) | ✅ | ✅ |
| Exams loading | ✅ | ✅ |
| History sidebar loading | ✅ | N/A (separate screen with `loading` state) |
| Selected assessment loading (when clicking history item) | ✅ `aiAssessmentLoading` | ❌ No loading indicator when loading assessment from history |
| Book list loading | ✅ `booksLoading` | ❌ No equivalent (uses AsyncStorage) |
| Page image loading per thumbnail | ✅ lazy-load per tile | ❌ No page thumbnails |
| Delete book in-progress | ✅ `deletingBookId` | ❌ No book delete feature |
| Worksheet generation loading | ✅ | ✅ (in AssessmentWorkspaceScreen) |
| Response save in-progress | ✅ debounced | ❌ Feature missing |

---

## 11. Missing Error Handling

| Error Case | Web | Mobile |
|-----------|-----|--------|
| Quiz generation quota exceeded | ✅ inline quota error message | ❌ Generic error only |
| Book upload failure | ✅ inline error with message | ❌ No book upload feature via web API |
| Book generation failure | ✅ step-level error display | ❌ Feature missing |
| Response save failure | ✅ silent (non-blocking) | ❌ Feature missing |
| Assessment load failure from history | ✅ `historyError` state | ⚠️ Partial (in RecentAssessmentsScreen) |
| Delete assessment failure | ✅ inline message | ✅ `Alert.alert` |
| Filter options load failure | ✅ silent no-op | ❌ Feature missing |
| Page image load failure per page | ✅ tracks `pageImgErrors` Set | ❌ Feature missing |

---

## 12. Missing UI States

| UI State | Web | Mobile |
|---------|-----|--------|
| Empty history sidebar (no saved quizzes) | ✅ Empty message | ✅ (RecentAssessmentsScreen has empty state) |
| Empty book list | ✅ Prompt to upload | ❌ No server book list |
| Quiz generated but not started | ✅ Shows questions inline | N/A (navigates away) |
| Response-restore dialog | ✅ Popup with Yes/No | ❌ Missing |
| Processing steps animation (OCR → normalize → generate) | ✅ Step-by-step animation | ❌ Just a spinner |
| Question marked for review | ✅ Visual indicator | ⚠️ Partial (QuizTakingScreen may have this) |
| Quiz submitted results view | ✅ Inline in QuizTab | ✅ QuizResultsScreen |
| Share URL created toast | ✅ | ✅ |
| Book thumbnail selected state | ✅ highlighted pages | ❌ No page selection UI |
| Delete book confirmation | ✅ Inline confirm button | ❌ No feature |

---

## 13. Component Gap Analysis

### Web Components (no Mobile equivalent)

| Web Component | Purpose | Mobile Gap |
|--------------|---------|------------|
| `QuizTab.tsx` | Self-contained quiz player with verify/submit/share | `QuizTakingScreen` is closest but different flow |
| `WorksheetTab.tsx` | Inline worksheet display | `WorksheetScreen` is closest |
| `AssessmentHistorySidebar.tsx` | Collapsible history panel | `RecentAssessmentsScreen` (separate screen) |
| `ImageAssessmentWorkspace.tsx` | Image assessment hub | `CreateImageQuizScreen` (similar functionality) |
| `YouTubeAssessmentWorkspace.tsx` | YouTube quiz workspace | ❌ No equivalent screen |
| `ExamPaperWorkspace.tsx` | Exam paper processing | ❌ No equivalent |
| `TopicSummaryModal.tsx` | Topic summary generation | ❌ No equivalent |
| `GenerateWorksheetModal.tsx` | Question-type picker for worksheet | ❌ No modal equivalent |
| `ShareQuizPopup.tsx` | Select questions to share | Partial — in QuizTakingScreen |
| `ShareOptionsPopup.tsx` | Share URL / copy link | Partial — in QuizTakingScreen |
| `MathRenderer.tsx` | LaTeX/math rendering | ❌ No math rendering |
| `QuizExplanationAccordion.tsx` | Explanation per question | ❌ No editable explanations |
| `DocumentPreview.tsx` | Inline PDF/image page viewer | ❌ No page viewer |

---

## 14. Recommended Implementation Plan

### Priority 1 — Critical Fixes (Breaks Parity Now)

**P1.1: Fix `itext` Validation in `CreateAIQuizScreen.tsx`**
- Remove the required validation for `itext` (Additional Instructions)
- Make it optional (pass empty string to API if blank)
- **File:** `src/screens/CreateAIQuizScreen.tsx` line ~208

**P1.2: Fix Assessment Type/Source on Save**
- Mobile saves with `assessment_type: 'quiz'`, `source: 'General'` / `'Competitive'`
- Web saves with `assessment_type: 'web-quiz'`, `source: 'AIQuiz'`
- Decision: Align mobile to use `assessment_type: 'web-quiz'` and `source: 'AIQuiz'` so history is shared across platforms
- **File:** `src/screens/CreateAIQuizScreen.tsx`

**P1.3: Fix Difficulty Value Mapping for Document Generation**
- Web converts difficulty label to API value: `easy → "2"`, `hard → "6"`, `medium → "mixed"`
- Mobile passes label directly
- **File:** `src/screens/document-upload/DocumentUploadPreviewScreen.tsx`

---

### Priority 2 — High Value Features

**P2.1: Response Save & Restore**
- After user selects answer in a quiz loaded from history → `PUT /api/v1/user-assessments/:id/responses`
- When loading a saved assessment that has responses → show "Restore previous answers?" dialog
- **New utility function** in `sharedApi.ts`: `updateAssessmentResponses(id, responses)`
- **Affects:** `QuizTakingScreen.tsx`, `RecentAssessmentsScreen.tsx`

**P2.2: YouTube Assessment Screen**
- Create `CreateYouTubeQuizScreen.tsx`
- URL input → `generateYouTubeQuiz()` from sharedApi → QuizTakingScreen
- Add to navigation stack and `QuizGenerationGrid`
- **Uses existing API:** `POST /api/v1/ytlink` already in `sharedApi.ts`

**P2.3: Worksheet Generation from AI Quiz Context**
- After AI quiz is generated, provide "Generate Worksheet" button in QuizTakingScreen or add it to CreateAIQuizScreen
- Use existing `generateWorksheet()` from `sharedApi.ts`
- Save with `assessment_type: 'worksheet'`, `source: 'Worksheet'`

---

### Priority 3 — Document Library (Book Search)

**P3.1: Server-backed Document Library Screen**
- New screen: `DocumentLibraryScreen.tsx`
- `GET /api/v1/pdf-questions/files?source=Document` to list books
- Filters: grade, subject, lesson (loaded from `GET /api/v1/study-materials/filters`)
- Search by filename
- Delete book: `DELETE /api/v1/study-materials/books/:id`
- Tap book → go to `DocumentUploadPreviewScreen` with book doc_id

**P3.2: Book Upload with Full Metadata**
- Update `DocumentUploadHomeScreen.tsx` to use `POST /api/v1/study-materials/books/upload` instead of `/rag/ingest-pdf`
- Add metadata fields: grade_level, subject, lesson_title, sub_lesson
- Or keep dual API approach (RAG for instant-use, books/upload for library)

**P3.3: Generate from Book Pages (study-materials endpoint)**
- When user selects a book from library and selects specific pages
- `POST /api/v1/study-materials/generate-from-book { doc_id, page_numbers[], question_count, difficulty, subject, grade_level, lesson_title }`
- New API function in `documentUploadApi.ts`

---

### Priority 4 — Nice-to-Have

**P4.1: Processing Steps Animation**
- Show step-level progress: Uploading → OCR → Normalization → Generation
- Replace current loading spinner with step indicators during document quiz generation

**P4.2: Explanation Editing**
- In quiz result view, allow teacher to edit explanations
- `PATCH /api/v1/user-assessments/:id/questions/:idx/explanation { explanation: "..." }`
- New function in `sharedApi.ts`

**P4.3: Topic Summary Feature**
- Trigger topic summary generation from quiz context
- New screen or modal

**P4.4: Math Rendering**
- Add LaTeX/math rendering support for quiz questions
- Consider `react-native-mathjax` or `react-native-math-view`

---

## Summary Table

| Category | Critical Gaps | High Priority | Medium Priority |
|----------|--------------|---------------|-----------------|
| Validation | itext required (breaks parity) | — | — |
| Assessment type/source | Different type/source strings (breaks history sync) | — | — |
| APIs | 11 web APIs not called in mobile | — | — |
| Screens | YouTube, Exam Paper, Topic Summary | Book Library | — |
| Features | Response save/restore | Worksheet from AI mode | Explanation editing |
| State | No response persistence | — | — |
| Navigation | navigate.replace breaks back flow | — | — |
| Document flow | No server book library, no page selection | Full metadata upload | Page thumbnail viewer |

---

*End of AI_ASSESSMENT_GAP_ANALYSIS.md*
