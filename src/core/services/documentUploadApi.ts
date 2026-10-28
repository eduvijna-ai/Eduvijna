import { apiClient, API_BASE_URL } from '../api/config';
import * as TokenStorage from '../services/tokenStorage';
import * as FileSystem from 'expo-file-system/legacy';
import { combineImagesToPdf } from './documentImageUtils';
import { appendDocumentUploadPart } from '../utils/documentUploadMultipart';

type DocumentUploadFilePart = {
  fileUri: string;
  fileName: string;
  mimeType?: string;
  file?: File | Blob;
};

function appendDocumentUploadFile(
  formData: FormData,
  fieldName: string,
  part: DocumentUploadFilePart,
): void {
  appendDocumentUploadPart(formData, fieldName, {
    uri: part.fileUri,
    name: part.fileName,
    mimeType: part.mimeType,
    file: part.file,
  });
}

export type DocumentUploadDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Web parity: a book quiz can only be generated from up to 5 pages at a time
 * (HandwrittenWorkspace enforces the same limit).
 */
export const MAX_QUIZ_PAGES = 5;

/** Max images from gallery or camera for Document / Handwritten capture sessions. */
export const MAX_IMAGE_UPLOADS = MAX_QUIZ_PAGES;

/**
 * Document file picker types — one multi-page file (PDF/DOC/etc.), not images.
 * Images must go through Gallery / Camera (up to MAX_IMAGE_UPLOADS).
 */
export const DOCUMENT_FILE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

export type BookPageImageSize = 'mini' | 'thumbnail' | 'medium' | 'full';

/** Full capture snapshot retained so Crop can be reversed without losing MIME/dims. */
export type DocumentCameraPageOriginal = {
  fileUri: string;
  fileName: string;
  mimeType: string;
  thumbnailUri?: string;
  width?: number;
  height?: number;
};

export interface DocumentCameraPage {
  pageNumber: number;
  /** Stable identity across renumber / reorder — never use array index for originals. */
  pageId: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  thumbnailUri?: string;
  width?: number;
  height?: number;
  /** First capture/import bytes + metadata; Restore returns to this. */
  original?: DocumentCameraPageOriginal;
}

export function newCameraPageId(): string {
  return `page-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Ensure pageId + original snapshot exist (idempotent). */
export function normalizeCameraPage(
  page: Omit<DocumentCameraPage, 'pageId' | 'original'> &
    Partial<Pick<DocumentCameraPage, 'pageId' | 'original'>>,
): DocumentCameraPage {
  const pageId = page.pageId || newCameraPageId();
  const original: DocumentCameraPageOriginal = page.original ?? {
    fileUri: page.fileUri,
    fileName: page.fileName,
    mimeType: page.mimeType,
    thumbnailUri: page.thumbnailUri || page.fileUri,
    width: page.width,
    height: page.height,
  };
  return {
    pageNumber: page.pageNumber,
    pageId,
    fileUri: page.fileUri,
    fileName: page.fileName,
    mimeType: page.mimeType,
    thumbnailUri: page.thumbnailUri || page.fileUri,
    width: page.width,
    height: page.height,
    original,
  };
}

export function restoreCameraPageOriginal(page: DocumentCameraPage): DocumentCameraPage {
  const original = page.original;
  if (!original) return page;
  return {
    ...page,
    fileUri: original.fileUri,
    fileName: original.fileName,
    mimeType: original.mimeType,
    thumbnailUri: original.thumbnailUri || original.fileUri,
    width: original.width,
    height: original.height,
    original,
  };
}

export function applyCroppedJpegToCameraPage(
  page: DocumentCameraPage,
  cropped: {
    uri: string;
    fileName: string;
    mimeType: 'image/jpeg';
    width: number;
    height: number;
  },
): DocumentCameraPage {
  const base = normalizeCameraPage(page);
  return {
    ...base,
    fileUri: cropped.uri,
    thumbnailUri: cropped.uri,
    fileName: cropped.fileName,
    mimeType: cropped.mimeType,
    width: cropped.width,
    height: cropped.height,
  };
}

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
  /** Camera session: pages stored locally (no server upload until OCR). */
  pages?: DocumentCameraPage[];
  isCameraSession?: boolean;
  extractedText?: string;
  ocrExtracted?: boolean;
  /** Page numbers included in the last successful OCR run. */
  extractedPageNumbers?: number[];
}

export interface BatchOCRPageResult {
  page_number: number;
  status: string;
  text?: string;
  latex?: string;
}

export interface BatchOCRFileResult {
  filename: string;
  file_id: string;
  file_type: string;
  total_pages: number;
  status: string;
  pages: BatchOCRPageResult[];
}

export interface BatchOCRResponse {
  success: boolean;
  message: string;
  files: BatchOCRFileResult[];
  total_files: number;
  successful_files: number;
  total_pages_processed: number;
}

/** Local preview URI for a page (camera session or single local file). */
const UUID_FILE_STEM =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Camera/gallery pickers often return a UUID as the file name — never use that as the book title. */
export function sanitizeCameraDocumentTitle(raw?: string): string {
  const candidate = String(raw || '')
    .replace(/\.[^/.]+$/, '')
    .trim();
  if (!candidate || UUID_FILE_STEM.test(candidate) || /^camera-\d+$/i.test(candidate)) {
    return 'Camera Document';
  }
  return candidate;
}

export function getLocalPageUri(book: DocumentUploadBook | null | undefined, pageNumber: number): string | undefined {
  if (!book) return undefined;
  const fromPages = book.pages?.find((p) => p.pageNumber === pageNumber);
  // Prefer full page file over any derived thumbnail (upload/OCR must not use cropped thumbs).
  if (fromPages) return fromPages.fileUri || fromPages.thumbnailUri;
  if (pageNumber === 1) return book.fileUri || book.thumbnailUri;
  return undefined;
}

export function createCameraSessionBook(firstPage: DocumentCameraPage, title?: string): DocumentUploadBook {
  const now = new Date().toISOString();
  const normalized = normalizeCameraPage(firstPage);
  const sessionTitle = sanitizeCameraDocumentTitle(title || normalized.fileName);
  return {
    id: `camera-${Date.now()}`,
    title: sessionTitle,
    originalName: normalized.fileName,
    totalPages: 1,
    pages: [normalized],
    isCameraSession: true,
    mimeType: normalized.mimeType || 'image/jpeg',
    thumbnailUri: normalized.thumbnailUri || normalized.fileUri,
    fileUri: normalized.fileUri,
    createdAt: now,
    ocrExtracted: false,
  };
}

export function appendCameraPage(book: DocumentUploadBook, page: DocumentCameraPage): DocumentUploadBook {
  const pages = [...(book.pages || []), normalizeCameraPage(page)].map((p, index) => ({
    ...p,
    pageNumber: index + 1,
  }));
  return {
    ...book,
    pages,
    totalPages: pages.length,
    thumbnailUri: pages[0]?.thumbnailUri || pages[0]?.fileUri,
    fileUri: pages[0]?.fileUri,
    ocrExtracted: false,
    extractedText: undefined,
    extractedPageNumbers: undefined,
  };
}

/** Build or extend a local image session from one or more gallery/camera pages (capped at MAX_IMAGE_UPLOADS). */
export function mergeCameraSessionPages(
  existing: DocumentUploadBook | null | undefined,
  newPages: DocumentCameraPage[],
  title?: string,
): DocumentUploadBook {
  if (!newPages.length) {
    if (existing?.isCameraSession) return existing;
    throw new Error('No images to add.');
  }

  let book: DocumentUploadBook;
  if (existing?.isCameraSession && (existing.pages?.length || 0) > 0) {
    book = existing;
    for (const page of newPages) {
      if ((book.pages?.length || 0) >= MAX_IMAGE_UPLOADS) break;
      book = appendCameraPage(book, page);
    }
  } else {
    const [first, ...rest] = newPages.slice(0, MAX_IMAGE_UPLOADS);
    book = createCameraSessionBook(first, title);
    for (const page of rest) {
      book = appendCameraPage(book, page);
    }
  }

  if (title?.trim()) {
    book = { ...book, title: sanitizeCameraDocumentTitle(title) };
  }
  return book;
}

/** Remove one camera page and renumber remaining pages. Returns null when no pages left. */
export function removeCameraPage(book: DocumentUploadBook, pageNumber: number): DocumentUploadBook | null {
  const pages = (book.pages || []).filter((p) => p.pageNumber !== pageNumber);
  if (pages.length === 0) return null;

  // Renumber display order only — pageId + original travel with each page.
  const renumbered = pages.map((p, index) =>
    normalizeCameraPage({
      ...p,
      pageNumber: index + 1,
    }),
  );

  return {
    ...book,
    pages: renumbered,
    totalPages: renumbered.length,
    thumbnailUri: renumbered[0]?.thumbnailUri || renumbered[0]?.fileUri,
    fileUri: renumbered[0]?.fileUri,
    ocrExtracted: false,
    extractedText: undefined,
    extractedPageNumbers: undefined,
  };
}

export function remapPageSelectionAfterDelete(selected: Set<number>, removedPage: number): Set<number> {
  const next = new Set<number>();
  selected.forEach((p) => {
    if (p === removedPage) return;
    if (p > removedPage) next.add(p - 1);
    else next.add(p);
  });
  return next;
}

export function aggregateOcrText(files: BatchOCRFileResult[]): string {
  const parts: string[] = [];
  for (const file of files) {
    if (file.status === 'success' || file.status === 'partial_success') {
      for (const page of file.pages) {
        if (page.status === 'success' && page.text?.trim()) {
          parts.push(page.text.trim());
        }
        if (page.latex?.trim()) {
          parts.push(page.latex.trim());
        }
      }
    }
  }
  return parts.join('\n\n');
}

export async function runBatchOcrOnImages(
  images: Array<{ uri: string; name: string; type: string; file?: File | Blob }>,
): Promise<BatchOCRResponse> {
  const formData = new FormData();
  images.forEach((img) => {
    appendDocumentUploadFile(formData, 'files', {
      fileUri: img.uri,
      fileName: img.name,
      mimeType: img.type,
      file: img.file,
    });
  });

  const response = await apiClient.post<BatchOCRResponse>('/api/v1/batch-ocr-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
  });

  return response.data;
}

export async function generateStrictQuizFromContent(
  content: string,
  language = 'English',
): Promise<
  Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    answer: string;
    explanation: string | null;
  }>
> {
  const response = await apiClient.post<{
    success: boolean;
    quiz: Array<{ question: string; options: string[]; correctAnswer: string }>;
    message: string;
  }>('/api/v1/quiz/generate-strict', { content, language }, { timeout: 120000 });

  const payload = response.data;
  if (!payload.success || !payload.quiz?.length) {
    throw new Error(payload.message || 'Assessment generation returned no questions.');
  }

  return payload.quiz.map((item, idx) => ({
    id: `cam-q-${idx}`,
    question: item.question,
    options: item.options,
    correctAnswer: item.correctAnswer,
    answer: item.correctAnswer,
    explanation: null,
  }));
}

export interface DocumentUploadRegenerationParams {
  type?: string;
  fileName?: string;
  grade?: string;
  subject?: string;
  level?: string;
  lesson?: string;
  count?: number;
  selectedPages?: number[];
  isCameraSession?: boolean;
  ocrText?: string;
  itext?: string;
  docId?: string;
  useServerBook?: boolean;
  fileUri?: string;
  mimeType?: string;
}

function buildStrictQuizContentFromOcr(params: {
  classValue?: string;
  subject?: string;
  lesson?: string;
  difficulty?: string;
  questionCount?: number;
  ocrText: string;
}): string {
  const parts: string[] = [];
  const cls = (params.classValue || '').trim();
  const sub = (params.subject || '').trim();
  const lesson = (params.lesson || '').trim();
  const difficulty = (params.difficulty || '').trim();

  if (cls) parts.push(`Class: ${cls}`);
  if (sub) parts.push(`Subject: ${sub}`);
  if (lesson) parts.push(`Lesson: ${lesson}`);
  if (difficulty) parts.push(`Difficulty: ${difficulty}`);
  if (params.questionCount) parts.push(`Number of questions: ${params.questionCount}`);
  parts.push(params.ocrText.trim());
  return parts.join('\n\n');
}

/** Regenerate a document-upload quiz (camera OCR, server book, or local file). */
export async function regenerateDocumentUploadQuiz(
  params: DocumentUploadRegenerationParams,
  currentQuiz: {
    id?: string | number;
    title?: string;
    class?: string;
    subject?: string;
    difficulty?: string;
    lesson?: string;
    questions?: Array<{ id: string }>;
  },
): Promise<{
  id?: string | number;
  title?: string;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    answer: string;
    explanation: string | null;
  }>;
  class?: string;
  subject?: string;
  difficulty?: string;
  lesson?: string;
  regenerationParams: DocumentUploadRegenerationParams;
}> {
  const difficulty = (params.level || currentQuiz.difficulty || 'medium') as DocumentUploadDifficulty;
  const questionCount = params.count || currentQuiz.questions?.length || 5;
  const pageNumbers = Array.isArray(params.selectedPages) ? params.selectedPages : [];
  const ocrText = String(params.ocrText || params.itext || '').trim();
  const regenerationParams: DocumentUploadRegenerationParams = {
    ...params,
    type: 'document-upload',
    ocrText: ocrText || params.ocrText,
    itext: ocrText || params.itext,
  };

  if (ocrText) {
    const content = buildStrictQuizContentFromOcr({
      classValue: params.grade || currentQuiz.class || '',
      subject: params.subject || currentQuiz.subject || '',
      lesson: params.lesson || currentQuiz.lesson || '',
      difficulty,
      questionCount,
      ocrText,
    });
    const questions = await generateStrictQuizFromContent(content);
    return {
      id: currentQuiz.id,
      title: currentQuiz.title,
      questions,
      class: currentQuiz.class,
      subject: currentQuiz.subject,
      difficulty,
      lesson: currentQuiz.lesson,
      regenerationParams,
    };
  }

  if (params.useServerBook && params.docId) {
    const result = await generateFromBook({
      docId: params.docId,
      pageNumbers,
      questionCount,
      difficulty,
      subject: params.subject || currentQuiz.subject || '',
      gradeLevel: params.grade || currentQuiz.class || '',
      lessonTitle: params.lesson || currentQuiz.lesson || '',
    });
    if (!result.questions.length) {
      throw new Error('generate_from_book_zero_questions');
    }
    return {
      id: currentQuiz.id,
      title: currentQuiz.title,
      questions: result.questions,
      class: currentQuiz.class,
      subject: currentQuiz.subject,
      difficulty,
      lesson: currentQuiz.lesson,
      regenerationParams,
    };
  }

  if (params.fileUri) {
    const result = await generateMultimodalAssessmentFromDocument({
      fileUri: params.fileUri,
      fileName: params.fileName || 'document.pdf',
      mimeType: params.mimeType || 'application/pdf',
      questionCount,
      difficulty,
      language: 'English',
      subject: params.subject || currentQuiz.subject || '',
      gradeLevel: params.grade || currentQuiz.class || '',
      lessonTitle: params.lesson || currentQuiz.lesson || '',
      selectedPages: pageNumbers,
    });
    return {
      id: currentQuiz.id,
      title: currentQuiz.title,
      questions: result.quizData.questions,
      class: currentQuiz.class,
      subject: currentQuiz.subject,
      difficulty,
      lesson: currentQuiz.lesson,
      regenerationParams: {
        ...regenerationParams,
        ...result.quizData.regenerationParams,
        fileUri: params.fileUri,
        mimeType: params.mimeType,
      },
    };
  }

  throw new Error('Cannot regenerate: document source is no longer available. Generate a new assessment from the document workspace.');
}

export interface GenerateMultimodalParams {
  fileUri: string;
  fileName: string;
  mimeType?: string;
  /** Web document picker File/Blob (preserved for multipart boundaries). */
  file?: File | Blob;
  questionCount: number;
  difficulty: DocumentUploadDifficulty;
  language?: string;
  subject?: string;
  gradeLevel?: string;
  lessonTitle?: string;
  selectedPages?: number[];
  additionalInstructions?: string;
}

// Web parity (HandwrittenWorkspace.difficultyToApi): easy → '2', medium → '4', hard → '6'.
export const toDifficultyPayload = (difficulty: DocumentUploadDifficulty): string => {
  if (difficulty === 'easy') return '2';
  if (difficulty === 'hard') return '6';
  return '4';
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
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(slice));
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

export type PageImageDownloadOutcome =
  | { kind: 'ok'; uri: string }
  | { kind: 'auth'; status: number }
  | { kind: 'not_found'; status: number }
  | { kind: 'rate_limited'; status: number }
  | { kind: 'server'; status: number }
  | { kind: 'empty' };

const classifyHttpStatus = (status: number): PageImageDownloadOutcome['kind'] | 'ok' => {
  if (status === 200) return 'ok';
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'empty';
};

export const looksLikeImageBytes = (bytes: Uint8Array): boolean => {
  if (bytes.length < 3) return false;
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return true;
  }
  // WebP (RIFF....WEBP)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }
  return false;
};

const base64PrefixToBytes = (b64: string): Uint8Array => {
  if (typeof globalThis.atob === 'function') {
    const bin = globalThis.atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node/Jest fallback without depending on Buffer in RN bundles.
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/=+$/, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const a = chars.indexOf(clean[i]);
    const b = chars.indexOf(clean[i + 1]);
    const c = chars.indexOf(clean[i + 2]);
    const d = chars.indexOf(clean[i + 3]);
    const triple = (a << 18) | (b << 12) | ((c >= 0 ? c : 0) << 6) | (d >= 0 ? d : 0);
    bytes.push((triple >> 16) & 0xff);
    if (c >= 0) bytes.push((triple >> 8) & 0xff);
    if (d >= 0) bytes.push(triple & 0xff);
  }
  return Uint8Array.from(bytes);
};

const deleteQuietly = async (path: string): Promise<void> => {
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    // ignore
  }
};

const downloadProtectedImage = async (
  url: string,
  dest: string,
  headers: Record<string, string>,
): Promise<PageImageDownloadOutcome> => {
  // Always wipe a prior dest so non-200 bodies cannot be mistaken for images later.
  await deleteQuietly(dest);

  try {
    const result = await FileSystem.downloadAsync(url, dest, { headers });
    const status = Number(result.status) || 0;
    if (status === 200 && result.uri) {
      // Verify magic bytes — FS download may still write JSON/HTML error bodies as 200 in edge cases.
      try {
        const b64 = await FileSystem.readAsStringAsync(result.uri, {
          encoding: FileSystem.EncodingType.Base64,
          length: 16,
          position: 0,
        });
        const probe = base64PrefixToBytes(b64);
        if (!looksLikeImageBytes(probe)) {
          await deleteQuietly(result.uri);
          // Fall through to axios (may still succeed with typed bytes).
        } else {
          return { kind: 'ok', uri: result.uri };
        }
      } catch {
        return { kind: 'ok', uri: result.uri };
      }
    } else {
      await deleteQuietly(dest);
      const classified = classifyHttpStatus(status);
      // Do not treat downloadAsync 401 as terminal — axios path can refresh via interceptors.
      if (classified === 'not_found' || classified === 'rate_limited' || classified === 'server') {
        // Continue to axios for a second opinion / clearer status, then classify.
      }
    }
  } catch {
    await deleteQuietly(dest);
  }

  try {
    // Do NOT set validateStatus: allow apiClient auth interceptor to refresh on 401.
    const response = await apiClient.get(url, {
      responseType: 'arraybuffer',
      headers,
      timeout: 60000,
    });
    const status = Number(response.status) || 0;
    if (status !== 200 || !response.data) {
      const classified = classifyHttpStatus(status);
      return classified === 'ok' || classified === 'empty'
        ? { kind: 'empty' }
        : { kind: classified, status };
    }

    const contentType = String(
      response.headers?.['content-type'] || response.headers?.['Content-Type'] || 'image/jpeg',
    );
    const bytes = new Uint8Array(response.data as ArrayBuffer);
    if (!bytes.length || !looksLikeImageBytes(bytes)) {
      if (!contentType.includes('image') && !contentType.includes('octet-stream')) {
        return { kind: 'empty' };
      }
      // Some gateways omit magic-friendly content; still require image/* when magic fails.
      if (!contentType.includes('image')) return { kind: 'empty' };
    }
    const ext = contentType.includes('png') || (bytes[0] === 0x89 && bytes[1] === 0x50) ? 'png' : 'jpg';
    const destWithExt = dest.replace(/\.(jpg|png)$/i, '') + `.${ext}`;
    await deleteQuietly(destWithExt);
    await FileSystem.writeAsStringAsync(destWithExt, uint8ToBase64(bytes), {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { kind: 'ok', uri: destWithExt };
  } catch (err: any) {
    const status = Number(err?.response?.status) || 0;
    if (status) {
      const classified = classifyHttpStatus(status);
      if (classified !== 'ok' && classified !== 'empty') {
        return { kind: classified, status };
      }
    }
    return { kind: 'empty' };
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
    const destBase = `${cacheDir}book-page-${cacheKey}`;
    // Reuse a previously written *image* cache file (survives screen remounts).
    for (const ext of ['jpg', 'png', 'jpeg']) {
      const existing = `${destBase}.${ext}`;
      try {
        const info = await FileSystem.getInfoAsync(existing);
        const sizeBytes = (info as { size?: number }).size || 0;
        if (!info.exists || sizeBytes < 32) {
          if (info.exists) await deleteQuietly(existing);
          continue;
        }
        const b64 = await FileSystem.readAsStringAsync(existing, {
          encoding: FileSystem.EncodingType.Base64,
          length: 16,
          position: 0,
        });
        const probe = base64PrefixToBytes(b64);
        if (looksLikeImageBytes(probe)) return existing;
        await deleteQuietly(existing);
      } catch {
        // continue
      }
    }
    const dest = `${destBase}.jpg`;

    // Pages may still be rasterising after upload — retry transient failures.
    // 404 on one URL must NOT skip other candidates (study-materials → pdf-questions → files).
    // Auth (401/403) after axios interceptor still fails → stop this id (token/permission).
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let authDenied = false;
      let sawNotFound = false;
      for (const url of pageImageUrlCandidates(id, page, size)) {
        const outcome = await downloadProtectedImage(url, dest, headers);
        if (outcome.kind === 'ok') return outcome.uri;
        if (outcome.kind === 'auth') {
          authDenied = true;
          break;
        }
        if (outcome.kind === 'not_found') {
          sawNotFound = true;
          continue;
        }
        if (outcome.kind === 'rate_limited') {
          await sleep(1500);
        }
      }
      if (authDenied) break;
      // Retry 404s for the first attempts while pages rasterise; final attempt accepts empty.
      if (sawNotFound && attempt < 2) {
        await sleep(1200);
        continue;
      }
      if (attempt < 2) await sleep(1200);
    }
  }

  return null;
}

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

/** Unwrap nested API question shapes (flat, quiz.*, questions.quizzes). */
function unwrapRawQuestion(q: any): {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string | null;
} {
  const nested = q?.quiz && typeof q.quiz === 'object' ? q.quiz : q;
  const optionsRaw = nested?.options ?? q?.options;
  const options = Array.isArray(optionsRaw)
    ? optionsRaw.map((o: any) => String(o ?? '').trim()).filter(Boolean)
    : [];
  const correctRaw = String(
    nested?.correctAnswer ??
      nested?.correct_answer ??
      nested?.answer ??
      q?.correctAnswer ??
      q?.correct_answer ??
      q?.answer ??
      '',
  ).trim();
  return {
    id: q?.id != null ? String(q.id) : nested?.id != null ? String(nested.id) : undefined,
    question: String(nested?.question ?? q?.question ?? '').trim(),
    options,
    correctAnswer: correctRaw,
    explanation:
      nested?.explanation != null
        ? String(nested.explanation)
        : q?.explanation != null
          ? String(q.explanation)
          : null,
  };
}

/**
 * Normalize generation API questions without inventing a default letter key.
 * Accepts letter (A–D) or full option text; drops empty/invalid items.
 */
export const normalizeQuestions = (questionsRaw: any[]): Array<{
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  answer: string;
  explanation: string | null;
}> => {
  const list = Array.isArray(questionsRaw)
    ? questionsRaw
    : Array.isArray((questionsRaw as any)?.quizzes)
      ? (questionsRaw as any).quizzes
      : [];

  return list
    .map((q: any, idx: number) => {
      const unwrapped = unwrapRawQuestion(q);
      const letter =
        unwrapped.correctAnswer.length === 1 && /^[A-Da-d]$/.test(unwrapped.correctAnswer)
          ? unwrapped.correctAnswer.toUpperCase()
          : '';
      const correctAnswer = letter || unwrapped.correctAnswer;
      return {
        id: unwrapped.id ?? `du-q-${idx}`,
        question: unwrapped.question,
        options: unwrapped.options,
        correctAnswer,
        answer: correctAnswer,
        explanation: unwrapped.explanation,
      };
    })
    .filter(
      (q: {
        question: string;
        options: string[];
      }) => q.question.length > 0 && q.options.length >= 2,
    );
};

/**
 * Pull question arrays from heterogeneous generate-from-book / multimodal payloads.
 * Aligned with extractQuizArrayFromGenerationResponse (curriculum handoff) so job-style
 * envelopes (`data.quiz`, `result.quiz`) are not silently treated as empty.
 */
export function extractQuestionsPayload(payload: any): any[] {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.questions) && payload.questions.length) return payload.questions;
  if (Array.isArray(payload.quiz) && payload.quiz.length) return payload.quiz;
  if (Array.isArray(payload?.questions?.quizzes) && payload.questions.quizzes.length) {
    return payload.questions.quizzes;
  }
  const data = payload.data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.quiz) && data.quiz.length) return data.quiz;
    if (Array.isArray(data.questions) && data.questions.length) return data.questions;
  }
  const result = payload.result;
  if (result && typeof result === 'object') {
    if (Array.isArray(result.quiz) && result.quiz.length) return result.quiz;
    if (Array.isArray(result.questions) && result.questions.length) return result.questions;
  }
  // Empty arrays still count as present for callers checking length === 0.
  if (Array.isArray(payload.questions)) return payload.questions;
  if (Array.isArray(payload.quiz)) return payload.quiz;
  if (Array.isArray(payload?.questions?.quizzes)) return payload.questions.quizzes;
  if (Array.isArray(data?.quiz)) return data.quiz;
  if (Array.isArray(data?.questions)) return data.questions;
  if (Array.isArray(result?.quiz)) return result.quiz;
  if (Array.isArray(result?.questions)) return result.questions;
  return [];
}

/** Redacted diagnostic fields from a generate-from-book style payload (no textbook text). */
export function summarizeGenerationPayload(payload: any): {
  success: boolean | null;
  requestId: string;
  totalQuestions: number | null;
  questionArrayLength: number;
  validatedQuestionCount: number;
  rawContentLength: number;
  pipelineStages: string[];
  error: string;
} {
  const questionsRaw = extractQuestionsPayload(payload);
  const validated = normalizeQuestions(questionsRaw);
  const stagesRaw = payload?.pipeline_stages;
  const pipelineStages = Array.isArray(stagesRaw)
    ? stagesRaw.map((s: unknown) => String(s ?? '').trim()).filter(Boolean).slice(0, 20)
    : typeof stagesRaw === 'object' && stagesRaw
      ? Object.entries(stagesRaw as Record<string, unknown>)
          .map(([k, v]) => `${k}:${String(v)}`)
          .slice(0, 20)
      : [];
  const total =
    Number(payload?.total_questions ?? payload?.totalQuestions ?? validated.length) || null;
  return {
    success:
      typeof payload?.success === 'boolean'
        ? payload.success
        : payload?.success == null
          ? null
          : Boolean(payload.success),
    requestId: String(payload?.request_id || payload?.requestId || '').trim(),
    totalQuestions: Number.isFinite(total as number) ? (total as number) : null,
    questionArrayLength: questionsRaw.length,
    validatedQuestionCount: validated.length,
    rawContentLength: String(payload?.raw_content || '').length,
    pipelineStages,
    error: String(payload?.error || payload?.message || '').trim(),
  };
}

export async function uploadDocumentToRag(params: {
  fileUri: string;
  fileName: string;
  mimeType?: string;
  file?: File | Blob;
  gradeLevel?: string;
  subject?: string;
  lessonTitle?: string;
  forceOcr?: boolean;
}): Promise<Partial<DocumentUploadBook>> {
  const formData = new FormData();
  appendDocumentUploadFile(formData, 'file', {
    fileUri: params.fileUri,
    fileName: params.fileName,
    mimeType: params.mimeType,
    file: params.file,
  });
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
 * Build a multi-page PDF from gallery/camera session pages and upload it to the
 * document library (same endpoint as web Upload Book / mobile Upload File).
 */
export async function saveImagePagesAsLibraryBook(params: {
  imageUris: string[];
  mimeTypes?: string[];
  title: string;
  gradeLevel?: string;
  subject?: string;
  lessonTitle?: string;
  subLesson?: string;
}): Promise<ServerBook> {
  const pdfUri = await combineImagesToPdf({
    imageUris: params.imageUris,
    mimeTypes: params.mimeTypes,
  });

  const safeTitle = (params.title || 'Gallery Document').trim() || 'Gallery Document';
  const slug =
    safeTitle
      .replace(/[^\w\-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 60) || 'gallery-document';

  return uploadBookWithMetadata({
    fileUri: pdfUri,
    fileName: `${slug}.pdf`,
    mimeType: 'application/pdf',
    title: safeTitle,
    gradeLevel: params.gradeLevel,
    subject: params.subject,
    lessonTitle: params.lessonTitle || safeTitle,
    subLesson: params.subLesson,
  });
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll the document library until an uploaded book reports enough pages
 * (or a terminal processing status). Used after camera PDF upload before
 * generateFromBook.
 */
export async function waitForLibraryBookReady(params: {
  docId: string;
  expectedPages: number;
  timeoutMs?: number;
  pollMs?: number;
}): Promise<ServerBook> {
  const expected = Math.max(1, params.expectedPages);
  const timeoutMs = params.timeoutMs ?? 90000;
  const pollMs = params.pollMs ?? 1500;
  const started = Date.now();
  let last: ServerBook | null = null;

  while (Date.now() - started < timeoutMs) {
    try {
      const books = await listServerBooks();
      const match = books.find((b) => String(b.docId) === String(params.docId));
      if (match) {
        last = match;
        const status = String(match.processingStatus || '').toLowerCase();
        if (match.totalPages >= expected || status === 'completed' || status === 'ready') {
          return match;
        }
        if (status === 'failed' || status === 'error') {
          throw new Error('Document processing failed on the server. Please try again.');
        }
      }
    } catch (err: any) {
      if (typeof err?.message === 'string' && err.message.includes('processing failed')) {
        throw err;
      }
      // Transient list failures — keep polling until timeout.
    }
    await sleepMs(pollMs);
  }

  // Do not soft-succeed with incomplete page counts — that produces empty generation.
  if (last && last.totalPages >= expected) {
    return last;
  }
  throw new Error(
    'Document is still processing. Please wait a moment and try Generate again.',
  );
}

/**
 * Fingerprint for camera selected pages — invalidates cached library uploads
 * after crop / restore / add / remove / selection changes.
 */
export function cameraSelectedPagesFingerprint(
  pages: Array<{ pageId?: string; pageNumber: number; fileUri: string; width?: number; height?: number }>,
): string {
  return pages
    .map(
      (p) =>
        `${p.pageId || p.pageNumber}|${p.fileUri}|${p.width || 0}x${p.height || 0}`,
    )
    .join(';;');
}

/**
 * Upload a book to the server library with full metadata.
 * POST /api/v1/study-materials/books/upload
 */
export async function uploadBookWithMetadata(params: {
  fileUri: string;
  fileName: string;
  mimeType?: string;
  file?: File | Blob;
  title: string;
  gradeLevel?: string;
  subject?: string;
  lessonTitle?: string;
  subLesson?: string;
}): Promise<ServerBook> {
  const formData = new FormData();
  appendDocumentUploadFile(formData, 'file', {
    fileUri: params.fileUri,
    fileName: params.fileName,
    mimeType: params.mimeType,
    file: params.file,
  });
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
  additionalInstructions?: string;
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
    // Web HandwrittenWorkspace sends language; backend GenerateFromBookBody defaults to "en".
    language: 'en',
    additional_instructions: (params.additionalInstructions || '').trim(),
  };

  const response = await apiClient.post('/api/v1/study-materials/generate-from-book', body, {
    timeout: 180000,
  });

  const payload = response?.data ?? {};
  const questions = normalizeQuestions(extractQuestionsPayload(payload));

  // Redacted generation diagnostics (cache dir) — never write tokens or textbook text.
  try {
    const dir = `${FileSystem.cacheDirectory || ''}eduvijna-diag`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
    const summary = summarizeGenerationPayload(payload);
    await FileSystem.writeAsStringAsync(
      `${dir}/generate-from-book-last.json`,
      JSON.stringify(
        {
          at: new Date().toISOString(),
          ...summary,
          docId: params.docId,
          pageNumbers: pages,
          difficulty: body.difficulty,
          questionCount: body.question_count,
          httpStatus: Number((response as any)?.status) || null,
          normalizedCount: questions.length,
        },
        null,
        2,
      ),
    );
  } catch {
    // Best-effort diagnostics only.
  }

  if (!questions.length) {
    const summary = summarizeGenerationPayload(payload);
    const diag = {
      at: new Date().toISOString(),
      success: summary.success,
      requestId: summary.requestId,
      totalQuestions: summary.totalQuestions,
      questionArrayLength: summary.questionArrayLength,
      validatedQuestionCount: summary.validatedQuestionCount,
      rawContentLength: summary.rawContentLength,
      pipelineStages: summary.pipelineStages,
      error: summary.error,
      topKeys: payload && typeof payload === 'object' ? Object.keys(payload).slice(0, 20) : [],
      docId: params.docId,
      pageNumbers: pages,
      difficulty: body.difficulty,
      questionCount: body.question_count,
      httpStatus: Number((response as any)?.status) || null,
    };
    console.warn('[generateFromBook] empty_questions', diag);
    try {
      const dir = `${FileSystem.cacheDirectory || ''}eduvijna-diag`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
      await FileSystem.writeAsStringAsync(
        `${dir}/generate-from-book-empty.json`,
        JSON.stringify(diag, null, 2),
      );
    } catch {
      // Best-effort only — never block the user-facing error path.
    }
    const fallback =
      summary.rawContentLength > 0 && summary.rawContentLength < 200
        ? 'Assessment generation returned no questions — selected-page content extraction looked too thin. Try different pages or a clearer scan.'
        : 'Assessment generation returned no questions. Please try different pages or configuration.';
    throw new Error(summary.error || fallback);
  }
  return {
    questions,
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
    regenerationParams: DocumentUploadRegenerationParams;
  };
  raw: any;
}> {
  const formData = new FormData();
  appendDocumentUploadFile(formData, 'files', {
    fileUri: params.fileUri,
    fileName: params.fileName,
    mimeType: params.mimeType,
    file: params.file,
  });
  formData.append('question_count', String(Math.max(1, Math.min(30, params.questionCount))));
  formData.append('difficulty', toDifficultyPayload(params.difficulty));
  formData.append('language', params.language || 'English');
  formData.append('subject', params.subject || 'General');
  formData.append('grade_level', params.gradeLevel || 'Class 10');
  formData.append('lesson_title', params.lessonTitle || 'Document Assessment');
  if (params.additionalInstructions?.trim()) {
    formData.append('additional_instructions', params.additionalInstructions.trim());
  }
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
  const questions = normalizeQuestions(extractQuestionsPayload(payload));
  if (!questions.length) {
    const apiError = String(payload?.error || payload?.message || '').trim();
    throw new Error(
      apiError ||
        'Assessment generation returned no questions. Please try another file or configuration.',
    );
  }

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
        fileUri: params.fileUri,
        mimeType: params.mimeType,
      },
    },
    raw: payload,
  };
}
