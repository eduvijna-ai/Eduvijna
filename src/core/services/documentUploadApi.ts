import { apiClient, API_BASE_URL } from '../api/config';
import * as TokenStorage from '../services/tokenStorage';
import * as FileSystem from 'expo-file-system/legacy';

export type DocumentUploadDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Web parity: a book quiz can only be generated from up to 5 pages at a time
 * (HandwrittenWorkspace enforces the same limit).
 */
export const MAX_QUIZ_PAGES = 5;

export type BookPageImageSize = 'mini' | 'thumbnail' | 'medium' | 'full';

export interface DocumentUploadBook {
  id: string;
  title: string;
  originalName: string;
  uploadedFileName?: string;
  docId?: string;
  totalPages: number;
  fileSize?: number;
  fileUri?: string;
  mimeType?: string;
  thumbnailUri?: string;
  createdAt: string;
}

export interface GenerateMultimodalParams {
  fileUri: string;
  fileName: string;
  mimeType?: string;
  questionCount: number;
  difficulty: DocumentUploadDifficulty;
  language?: string;
  subject?: string;
  gradeLevel?: string;
  lessonTitle?: string;
  selectedPages?: number[];
}

// Web parity (HandwrittenWorkspace.difficultyToApi): easy → '2', medium → 'mixed', hard → '6'.
const toDifficultyPayload = (difficulty: DocumentUploadDifficulty): string => {
  if (difficulty === 'easy') return '2';
  if (difficulty === 'hard') return '6';
  return 'mixed';
};

export const isPdfAsset = (fileName?: string, mimeType?: string): boolean =>
  mimeType === 'application/pdf' || (fileName || '').toLowerCase().endsWith('.pdf');

const parsePageCount = (doc: any, payload: any): number => {
  const candidates = [
    doc?.total_pages,
    doc?.page_count,
    doc?.pages,
    doc?.num_pages,
    payload?.total_pages,
    payload?.page_count,
  ];
  for (const raw of candidates) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 1;
};

const pickNonEmptyId = (...values: unknown[]): string => {
  for (const value of values) {
    const id = String(value ?? '').trim();
    if (id) return id;
  }
  return '';
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Candidate image URLs — study-materials (web), pdf-questions, then files API. */
const pageImageUrlCandidates = (
  docId: string,
  page: number,
  size: BookPageImageSize,
): string[] => {
  const id = encodeURIComponent(docId);
  const isThumb = size === 'mini' || size === 'thumbnail';
  const urls: string[] = [];

  if (isThumb) {
    urls.push(`${API_BASE_URL}/api/v1/study-materials/books/${id}/pages/${page}/image?size=mini`);
    urls.push(`${API_BASE_URL}/api/v1/study-materials/books/${id}/pages/${page}/image?size=thumbnail`);
    urls.push(`${API_BASE_URL}/api/v1/pdf-questions/files/${id}/pages/${page}/thumbnail`);
    urls.push(`${API_BASE_URL}/api/v1/files/${id}/pages/${page}/image?size=thumbnail`);
  } else {
    urls.push(`${API_BASE_URL}/api/v1/study-materials/books/${id}/pages/${page}/image?size=${size}`);
    urls.push(`${API_BASE_URL}/api/v1/study-materials/books/${id}/pages/${page}/image?size=medium`);
    urls.push(`${API_BASE_URL}/api/v1/pdf-questions/files/${id}/pages/${page}/image`);
    urls.push(`${API_BASE_URL}/api/v1/files/${id}/pages/${page}/image?size=${size}`);
    urls.push(`${API_BASE_URL}/api/v1/files/${id}/pages/${page}/image?size=medium`);
  }

  return urls;
};

const uint8ToBase64 = (bytes: Uint8Array): string => {
  if (typeof globalThis.btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return globalThis.btoa(binary);
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    result += chars[(triple >> 18) & 0x3f];
    result += chars[(triple >> 12) & 0x3f];
    result += i + 1 < bytes.length ? chars[(triple >> 6) & 0x3f] : '=';
    result += i + 2 < bytes.length ? chars[triple & 0x3f] : '=';
  }
  return result;
};

const downloadProtectedImage = async (
  url: string,
  dest: string,
  headers: Record<string, string>,
): Promise<string | null> => {
  try {
    const result = await FileSystem.downloadAsync(url, dest, { headers });
    if (result.status === 200 && result.uri) return result.uri;
  } catch {
    // fall through to axios fallback
  }

  try {
    const response = await apiClient.get(url, {
      responseType: 'arraybuffer',
      headers,
      timeout: 60000,
    });
    if (response.status !== 200 || !response.data) return null;

    const contentType = String(response.headers['content-type'] || 'image/jpeg');
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const destWithExt = dest.replace(/\.(jpg|png)$/i, '') + `.${ext}`;
    const bytes = new Uint8Array(response.data as ArrayBuffer);

    await FileSystem.writeAsStringAsync(destWithExt, uint8ToBase64(bytes), {
      encoding: FileSystem.EncodingType.Base64,
    });
    return destWithExt;
  } catch {
    return null;
  }
};

/**
 * Fetch a protected book page image as a local file:// URI (works reliably in RN Image).
 * Tries study-materials then pdf-questions/files endpoints — same as web.
 */
export async function fetchBookPageImage(
  docId: string,
  page: number,
  size: BookPageImageSize = 'medium',
  alternateIds: string[] = [],
): Promise<string | null> {
  if (!docId || !Number.isInteger(page) || page < 1) return null;

  const token = await TokenStorage.getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return null;

  const ids = [docId, ...alternateIds].filter(
    (id, index, list) => id && list.indexOf(id) === index,
  );

  for (const id of ids) {
    const cacheKey = `${id}-${page}-${size}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dest = `${cacheDir}book-page-${cacheKey}.jpg`;

    // Pages may still be rasterising immediately after upload — retry briefly.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      for (const url of pageImageUrlCandidates(id, page, size)) {
        const uri = await downloadProtectedImage(url, dest, headers);
        if (uri) return uri;
      }
      if (attempt < 2) await sleep(1200);
    }
  }

  return null;
};

const findServerBookMatch = (
  books: ServerBook[],
  docId: string,
  searchHint?: string,
): ServerBook | null => {
  const hint = (searchHint || '').trim().toLowerCase();
  return (
    books.find(
      (b) =>
        b.docId === docId ||
        (hint &&
          (b.filename?.toLowerCase() === hint ||
            b.title?.toLowerCase() === hint ||
            b.filename?.toLowerCase().includes(hint))),
    ) ?? null
  );
};

/**
 * Look up the canonical server-library record (pdf-questions/files) for a book.
 * Upload returns study-materials doc_id; page thumbnails often need pdf-questions file_id.
 */
export async function resolveServerBook(
  docId: string,
  searchHint?: string,
): Promise<ServerBook | null> {
  if (!docId && !searchHint?.trim()) return null;
  try {
    const hint = (searchHint || '').trim();
    if (hint) {
      const byHint = await listServerBooks(hint);
      const found = findServerBookMatch(byHint, docId, hint);
      if (found) return found;
    }
    const all = await listServerBooks();
    return findServerBookMatch(all, docId, hint);
  } catch {
    return null;
  }
}

/**
 * Resolve accurate page count from the server document library (pdf-questions/files).
 * Used when RAG ingest omits total_pages or returns a stale default.
 */
export async function resolveBookPageCount(
  docId: string,
  searchHint?: string,
): Promise<number | null> {
  const match = await resolveServerBook(docId, searchHint);
  return match && match.totalPages > 0 ? match.totalPages : null;
}

const normalizeQuestions = (questionsRaw: any[]): Array<{
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  answer: string;
  explanation: string | null;
}> => {
  if (!Array.isArray(questionsRaw)) return [];

  return questionsRaw
    .map((q: any, idx: number) => {
      const options = Array.isArray(q?.options) ? q.options.map((o: any) => String(o ?? '').trim()) : [];
      const correct = String(q?.correctAnswer ?? q?.answer ?? 'A').trim().toUpperCase();
      const safeCorrect = ['A', 'B', 'C', 'D'].includes(correct) ? correct : 'A';
      return {
        id: String(q?.id ?? `du-q-${idx}`),
        question: String(q?.question ?? '').trim(),
        options,
        correctAnswer: safeCorrect,
        answer: safeCorrect,
        explanation: q?.explanation ? String(q.explanation) : null,
      };
    })
    .filter((q) => q.question.length > 0 && q.options.length >= 2);
};

export async function uploadDocumentToRag(params: {
  fileUri: string;
  fileName: string;
  mimeType?: string;
  gradeLevel?: string;
  subject?: string;
  lessonTitle?: string;
  forceOcr?: boolean;
}): Promise<Partial<DocumentUploadBook>> {
  const formData = new FormData();
  formData.append('file', {
    uri: params.fileUri,
    name: params.fileName,
    type: params.mimeType || 'application/octet-stream',
  } as any);
  formData.append('auto_embed', 'true');
  formData.append('force_ocr', params.forceOcr ? 'true' : 'false');

  if (params.gradeLevel) formData.append('grade_level', params.gradeLevel);
  if (params.subject) formData.append('subject', params.subject);
  if (params.lessonTitle) formData.append('lesson_title', params.lessonTitle);

  const response = await apiClient.post('/api/v1/rag/ingest-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

  const payload = response?.data ?? {};
  const firstDoc = Array.isArray(payload?.documents) ? payload.documents[0] : null;

  return {
    uploadedFileName:
      firstDoc?.title ||
      firstDoc?.original_filename ||
      firstDoc?.filename ||
      params.fileName,
    docId: firstDoc?.doc_id || firstDoc?.id,
    totalPages: parsePageCount(firstDoc, payload),
    fileSize: Number(firstDoc?.file_size || 0) || undefined,
  };
}

// ============================================================================
// SERVER DOCUMENT LIBRARY (study-materials / pdf-questions)
// Mirrors the web HandwrittenWorkspace "Book Search" panel APIs so saved books
// are shared across web and mobile rather than living only in local storage.
// ============================================================================

export interface ServerBook {
  docId: string;
  title: string;
  filename: string;
  gradeLevel: string;
  subject: string;
  lessonTitle: string;
  subLesson: string;
  totalPages: number;
  processingStatus: string;
  createdAt?: string;
}

export interface BookFilterOptions {
  grade_levels: string[];
  subjects: string[];
  lessons: string[];
  sub_lessons: string[];
}

const mapServerBook = (f: any, idPreference: 'file_id' | 'doc_id' = 'file_id'): ServerBook => ({
  docId:
    idPreference === 'doc_id'
      ? pickNonEmptyId(f?.doc_id, f?.file_id, f?.id)
      : pickNonEmptyId(f?.file_id, f?.doc_id, f?.id),
  title: f?.original_filename || f?.title || f?.file_id || f?.doc_id || 'Untitled',
  filename: f?.original_filename || f?.filename || '',
  gradeLevel: f?.grade_level || '',
  subject: f?.subject || '',
  lessonTitle: f?.lesson_title || f?.original_filename || '',
  subLesson: f?.sub_lesson || '',
  totalPages: Number(f?.page_count ?? f?.total_pages ?? 0),
  processingStatus: f?.status || f?.processing_status || 'completed',
  createdAt: f?.created_at || undefined,
});

/**
 * Upload a book to the server library with full metadata.
 * POST /api/v1/study-materials/books/upload
 */
export async function uploadBookWithMetadata(params: {
  fileUri: string;
  fileName: string;
  mimeType?: string;
  title: string;
  gradeLevel?: string;
  subject?: string;
  lessonTitle?: string;
  subLesson?: string;
}): Promise<ServerBook> {
  const formData = new FormData();
  formData.append('file', {
    uri: params.fileUri,
    name: params.fileName,
    type: params.mimeType || 'application/octet-stream',
  } as any);
  formData.append('title', params.title.trim());
  formData.append('grade_level', (params.gradeLevel || '').trim());
  formData.append('subject', (params.subject || '').trim());
  formData.append('lesson_title', (params.lessonTitle || '').trim());
  formData.append('sub_lesson', (params.subLesson || '').trim());

  const response = await apiClient.post('/api/v1/study-materials/books/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

  const book = response?.data?.book ?? response?.data ?? {};
  const mapped = mapServerBook(book, 'doc_id');
  return { ...mapped, totalPages: Math.max(1, mapped.totalPages || 0) };
}

/**
 * List uploaded books from the server (Document source).
 * GET /api/v1/pdf-questions/files?source=Document[&search=...]
 */
export async function listServerBooks(search?: string): Promise<ServerBook[]> {
  const params = new URLSearchParams();
  params.set('source', 'Document');
  const term = (search || '').trim();
  if (term) params.set('search', term);

  const response = await apiClient.get(`/api/v1/pdf-questions/files?${params.toString()}`);
  const files = Array.isArray(response?.data?.files) ? response.data.files : [];
  return files.map(mapServerBook);
}

/**
 * Get filter options (grades, subjects, lessons) for the book library.
 * GET /api/v1/study-materials/filters
 */
export async function getBookFilters(): Promise<BookFilterOptions> {
  try {
    const response = await apiClient.get('/api/v1/study-materials/filters');
    const raw = response?.data ?? {};
    return {
      grade_levels: Array.isArray(raw.grade_levels) ? raw.grade_levels : [],
      subjects: Array.isArray(raw.subjects) ? raw.subjects : [],
      lessons: Array.isArray(raw.lessons) ? raw.lessons : [],
      sub_lessons: Array.isArray(raw.sub_lessons) ? raw.sub_lessons : [],
    };
  } catch {
    return { grade_levels: [], subjects: [], lessons: [], sub_lessons: [] };
  }
}

/**
 * Delete a book from the server library.
 * DELETE /api/v1/study-materials/books/:docId
 */
export async function deleteServerBook(docId: string): Promise<void> {
  await apiClient.delete(`/api/v1/study-materials/books/${docId}`);
}

/**
 * Generate a quiz from selected pages of an already-uploaded book.
 * POST /api/v1/study-materials/generate-from-book
 * Returns questions normalized to the QuizTakingScreen shape.
 */
export async function generateFromBook(params: {
  docId: string;
  pageNumbers: number[];
  questionCount: number;
  difficulty: DocumentUploadDifficulty;
  subject?: string;
  gradeLevel?: string;
  lessonTitle?: string;
}): Promise<{
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    answer: string;
    explanation: string | null;
  }>;
  rawContent: string;
  raw: any;
}> {
  const pages = Array.from(new Set(params.pageNumbers))
    .filter((p) => Number.isInteger(p) && p > 0)
    .sort((a, b) => a - b)
    .slice(0, MAX_QUIZ_PAGES);

  const body = {
    doc_id: params.docId,
    page_numbers: pages,
    question_count: Math.max(1, Math.min(30, params.questionCount)),
    difficulty: toDifficultyPayload(params.difficulty),
    subject: params.subject || '',
    grade_level: params.gradeLevel || '',
    lesson_title: params.lessonTitle || '',
  };

  const response = await apiClient.post('/api/v1/study-materials/generate-from-book', body, {
    timeout: 180000,
  });

  const payload = response?.data ?? {};
  return {
    questions: normalizeQuestions(payload?.questions || []),
    rawContent: String(payload?.raw_content || ''),
    raw: payload,
  };
}

/**
 * Extract raw text content from selected book pages (for worksheet generation).
 * POST /api/v1/study-materials/extract-raw-content
 */
export async function extractRawContent(params: {
  docId: string;
  pageNumbers: number[];
}): Promise<string> {
  try {
    const response = await apiClient.post(
      '/api/v1/study-materials/extract-raw-content',
      { doc_id: params.docId, page_numbers: params.pageNumbers },
      { timeout: 120000 },
    );
    return String(response?.data?.raw_content || '');
  } catch {
    return '';
  }
}

export async function generateMultimodalAssessmentFromDocument(params: GenerateMultimodalParams): Promise<{
  quizData: {
    id: string;
    title: string;
    class?: string;
    subject?: string;
    difficulty?: string;
    lesson?: string;
    questions: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: string;
      answer: string;
      explanation: string | null;
    }>;
    regenerationParams: {
      type: 'document-upload';
      fileName: string;
      grade: string;
      subject: string;
      level: string;
      lesson: string;
      count: number;
        selectedPages?: number[];
    };
  };
  raw: any;
}> {
  const formData = new FormData();
  formData.append('files', {
    uri: params.fileUri,
    name: params.fileName,
    type: params.mimeType || 'application/octet-stream',
  } as any);
  formData.append('question_count', String(Math.max(1, Math.min(30, params.questionCount))));
  formData.append('difficulty', toDifficultyPayload(params.difficulty));
  formData.append('language', params.language || 'English');
  formData.append('subject', params.subject || 'General');
  formData.append('grade_level', params.gradeLevel || 'Class 10');
  formData.append('lesson_title', params.lessonTitle || 'Document Assessment');
  if (Array.isArray(params.selectedPages) && params.selectedPages.length > 0) {
    const cleaned = Array.from(
      new Set(
        params.selectedPages
          .map((p) => Number(p))
          .filter((p) => Number.isInteger(p) && p > 0),
      ),
    ).sort((a, b) => a - b);

    if (cleaned.length > 0) {
      // Keep both keys for backward/forward compatibility with backend variants.
      formData.append('selected_pages', JSON.stringify(cleaned));
      formData.append('selected_page_numbers', cleaned.join(','));
    }
  }

  const response = await apiClient.post('/api/v1/assessment/generate-multimodal', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
  });

  const payload = response?.data ?? {};
  const questions = normalizeQuestions(payload?.questions || []);

  return {
    quizData: {
      id: String(payload?.request_id || `du-${Date.now()}`),
      title: params.lessonTitle || params.fileName,
      class: params.gradeLevel,
      subject: params.subject,
      difficulty: params.difficulty,
      lesson: params.lessonTitle,
      questions,
      regenerationParams: {
        type: 'document-upload',
        fileName: params.fileName,
        grade: params.gradeLevel || '',
        subject: params.subject || '',
        level: params.difficulty,
        lesson: params.lessonTitle || '',
        count: params.questionCount,
        selectedPages: params.selectedPages,
      },
    },
    raw: payload,
  };
}
