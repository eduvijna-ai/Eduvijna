/**
 * Document Assessment → From Books saved-books API (Quiz-React ContentService parity).
 * Web revision: Quiz-React origin/main 21f9a1d (PR #326 class-10 rebind).
 */

import { apiClient } from '../api/config';
import { normalizeGradeToken } from './savedBooksCurriculumSemantic';
import {
  ASSESSMENT_DEPENDENCY_UNAVAILABLE_CODE,
  ASSESSMENT_GENERATION_CANCELLED_CODE,
  ASSESSMENT_GENERATION_FAILED_CODE,
  ASSESSMENT_GENERATION_TIMEOUT_CODE,
  CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_BACKEND_MESSAGE,
  CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_CODE,
  CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_UI_MESSAGE,
  CURRICULUM_VERIFICATION_FAILED_BACKEND_MESSAGE,
  CURRICULUM_VERIFICATION_FAILED_CODE,
  CURRICULUM_VERIFICATION_FAILED_UI_MESSAGE,
  createCurriculumGenerationError,
  extractCurriculumErrorCode,
  getApiErrorMessage,
  getCurriculumGenerationErrorMessage,
  isAssessmentInfrastructureFailure,
  isCurriculumScopeNotAssessmentReadyError,
  isCurriculumVerificationFailedError,
  type CurriculumGenerationErrorCode,
} from './curriculumGenerationErrors';

export const SAVED_BOOKS_GENERATE_PATH = '/api/v1/content/saved-books/generate';
export const SAVED_BOOKS_BOARDS_PATH = '/api/v1/content/saved-books/boards';
export const SAVED_BOOKS_CLASSES_PATH = '/api/v1/content/saved-books/classes';
export const SAVED_BOOKS_SUBJECTS_PATH = '/api/v1/content/saved-books/subjects';
export const SAVED_BOOKS_TOPICS_PATH = '/api/v1/content/saved-books/topics';
export const SAVED_BOOKS_SUBTOPICS_PATH = '/api/v1/content/saved-books/subtopics';
export const SAVED_BOOKS_REFINEMENTS_PATH = '/api/v1/content/saved-books/curriculum-refinements';

export type SavedBooksGenerationType =
  | 'assessment'
  | 'worksheet'
  | 'summary'
  | 'lesson_plan'
  | 'flashcards';

export type SavedBooksFormatType = 'markdown' | 'latex' | 'katex';

export interface SavedBooksDropdownItem {
  id: number;
  label: string;
  slug?: string;
}

export interface SavedBooksCurriculumContext {
  board_code: string;
  grade_code: string;
  subject_code: string;
  version_label?: string;
  unit_code?: string;
}

export interface SavedBooksGenerateParams {
  generation_type: SavedBooksGenerationType;
  board_id?: number;
  board_name?: string;
  class_id?: number;
  class_name?: string;
  subject_id?: number;
  subject_name?: string;
  topics?: string[];
  subtopics?: string[];
  language?: string;
  difficulty?: string;
  num_questions?: number;
  additional_instructions?: string;
  school_id?: number;
  format_type?: SavedBooksFormatType;
  curriculum_context?: SavedBooksCurriculumContext;
}

export interface CurriculumQuizItem {
  question: string;
  options: string[];
  correctAnswer?: string;
  answer?: string;
  explanation?: string;
  verification_level?: string;
  original_item_index?: number;
  slot_id?: string;
}

export interface AssessmentIntelligenceSummary {
  alignment_status: string;
  curriculum?: {
    board?: { code?: string; label?: string };
    grade?: { code?: string; label?: string };
    subject?: { code?: string; label?: string };
  } | null;
  specification?: { curriculum_code?: string; version_label?: string } | null;
  selected_unit?: { unit_code?: string; title?: string } | null;
  warnings?: Array<{ code?: string; message?: string }>;
  framework_validation?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface SavedBooksGenerateResult {
  success?: boolean;
  generation_type?: SavedBooksGenerationType;
  context_chunks?: number;
  message?: string;
  quiz?: CurriculumQuizItem[];
  /** Some saved-books job payloads return questions instead of quiz. */
  questions?: CurriculumQuizItem[];
  assessment_intelligence?: AssessmentIntelligenceSummary;
  delivery_status?: string;
  requested_question_count?: number;
  generated_question_count?: number;
  returned_question_count?: number;
  verified_question_count?: number;
  framework_verified_question_count?: number;
  curriculum_grounded_question_count?: number;
  excluded_question_count?: number;
  excluded_items?: unknown[];
}

export interface SavedBooksGenerationJobAccepted {
  accepted: true | boolean;
  job_id: string;
  status: string;
  stage?: string;
  poll_after_ms?: number;
  status_url?: string;
}

export interface SavedBooksGenerationJobStatus {
  job_id: string;
  status: string;
  stage?: string;
  poll_after_ms?: number;
  status_url?: string;
  result?: SavedBooksGenerateResult;
  result_payload?: SavedBooksGenerateResult;
  error_code?: string;
  error_message?: string;
  message?: string;
}

export interface GenerateFromSavedBooksOptions {
  signal?: AbortSignal;
  idempotencyKey?: string;
  onStage?: (stage: string | undefined, status: string | undefined) => void;
  onJobAccepted?: (jobId: string) => void;
}

export interface SavedBooksCurriculumRefinementsParams {
  board_code: string;
  grade_code: string;
  subject_code: string;
  version_label: string;
  unit_code: string;
  school_id?: number;
  topics?: string[];
}

export interface SavedBooksCurriculumRefinementsResult {
  success?: boolean;
  topics: SavedBooksDropdownItem[];
  subtopics: SavedBooksDropdownItem[];
  matched_content_count?: number;
}

export interface SavedBooksFileModePrefs {
  boardId?: number;
  boardLabel?: string;
  classId?: number;
  classLabel?: string;
  subjectId?: number;
  subjectLabel?: string;
  curriculumBoardCode?: string;
  curriculumGradeCode?: string;
  curriculumSubjectCode?: string;
  curriculumVersionLabel?: string;
  curriculumUnitCode?: string;
  topics: string[];
  subtopics: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  language: string;
  questionCount: number;
  instructions: string;
}

export const DEFAULT_FILE_MODE_PREFS: SavedBooksFileModePrefs = {
  topics: [],
  subtopics: [],
  difficulty: 'medium',
  language: 'en',
  questionCount: 5,
  instructions: 'summary',
};

export const FILE_MODE_DEFAULT_INSTRUCTIONS = 'summary';

const KATEX_SUBJECTS = new Set(['mathematics', 'math', 'physics', 'chemistry']);

export function resolveSummaryFormat(subject: string): SavedBooksFormatType {
  const normalized = subject.trim().toLowerCase();
  return KATEX_SUBJECTS.has(normalized) ? 'katex' : 'markdown';
}

const ASSESSMENT_GENERATION_POLL_INITIAL_MS = 1_000;
const ASSESSMENT_GENERATION_POLL_MAX_MS = 5_000;
export const ASSESSMENT_GENERATION_POLL_MAX_DURATION_MS = 1_800_000;
const GENERATE_POST_TIMEOUT_MS = 180_000;

export interface VerifiedDeliverySummary {
  hasDeliveryMetadata: boolean;
  returnedCount: number;
  notice: string | null;
}

export function summarizeVerifiedDelivery(
  source: SavedBooksGenerateResult | null | undefined,
  options: { returnedCountFallback?: number } = {},
): VerifiedDeliverySummary {
  const row = source && typeof source === 'object' ? source : {};
  const rawStatus = typeof row.delivery_status === 'string' ? row.delivery_status.trim() : '';
  const rawVerified = Number.isFinite(Number(row.verified_question_count))
    ? Number(row.verified_question_count)
    : null;
  const rawFramework = Number.isFinite(Number(row.framework_verified_question_count))
    ? Number(row.framework_verified_question_count)
    : null;
  const rawGrounded = Number.isFinite(Number(row.curriculum_grounded_question_count))
    ? Number(row.curriculum_grounded_question_count)
    : null;
  const rawReturned = Number.isFinite(Number(row.returned_question_count))
    ? Number(row.returned_question_count)
    : null;
  return {
    hasDeliveryMetadata:
      rawStatus.length > 0 || rawVerified !== null || rawFramework !== null || rawGrounded !== null,
    returnedCount: rawReturned ?? options.returnedCountFallback ?? 0,
    notice: null,
  };
}

export function buildSavedBooksCacheKey(
  level: string,
  schoolId: number | undefined,
  parts: Array<string | number | undefined>,
  accountId?: string | number | null,
): string {
  return `${accountId ?? 'anon'}:${level}:${schoolId ?? 'all'}:${parts.map((part) => String(part ?? '')).join(':')}`;
}

export function buildSavedBooksBoardsPath(schoolId?: number): string {
  const params = new URLSearchParams();
  if (schoolId) params.set('school_id', String(schoolId));
  const query = params.toString();
  return `${SAVED_BOOKS_BOARDS_PATH}${query ? `?${query}` : ''}`;
}

export function buildSavedBooksClassesPath(boardId: number, schoolId?: number): string {
  const params = new URLSearchParams({ board_id: String(boardId) });
  if (schoolId) params.set('school_id', String(schoolId));
  return `${SAVED_BOOKS_CLASSES_PATH}?${params}`;
}

export function buildSavedBooksSubjectsPath(
  boardId: number,
  classId: number,
  schoolId?: number,
): string {
  const params = new URLSearchParams({
    board_id: String(boardId),
    class_id: String(classId),
  });
  if (schoolId) params.set('school_id', String(schoolId));
  return `${SAVED_BOOKS_SUBJECTS_PATH}?${params}`;
}

export function buildSavedBooksTopicsPath(
  boardId: number,
  classId: number,
  subjectId: number,
  schoolId?: number,
): string {
  const params = new URLSearchParams({
    board_id: String(boardId),
    class_id: String(classId),
    subject_id: String(subjectId),
  });
  if (schoolId) params.set('school_id', String(schoolId));
  return `${SAVED_BOOKS_TOPICS_PATH}?${params}`;
}

export function buildSavedBooksSubtopicsPath(
  boardId: number,
  classId: number,
  subjectId: number,
  topics?: string[],
  schoolId?: number,
): string {
  const params = new URLSearchParams({
    board_id: String(boardId),
    class_id: String(classId),
    subject_id: String(subjectId),
  });
  if (topics?.length) params.set('topics', topics.join(','));
  if (schoolId) params.set('school_id', String(schoolId));
  return `${SAVED_BOOKS_SUBTOPICS_PATH}?${params}`;
}

export function buildSavedBooksCurriculumRefinementsPath(
  params: SavedBooksCurriculumRefinementsParams,
): string {
  const query = new URLSearchParams({
    board_code: params.board_code,
    grade_code: params.grade_code,
    subject_code: params.subject_code,
    version_label: params.version_label,
    unit_code: params.unit_code,
  });
  if (params.school_id != null) {
    query.set('school_id', String(params.school_id));
  }
  for (const topic of params.topics || []) {
    const cleaned = topic.trim();
    if (cleaned) query.append('topic', cleaned);
  }
  return `${SAVED_BOOKS_REFINEMENTS_PATH}?${query.toString()}`;
}

export function buildTrustedGenerationJobStatusPath(
  jobId: string,
  statusUrl?: string,
  schoolId?: number,
): string {
  const fallback = `/api/v1/content/saved-books/generation-jobs/${encodeURIComponent(jobId)}`;
  const path =
    statusUrl && statusUrl.startsWith('/') && !statusUrl.startsWith('//') ? statusUrl : fallback;

  if (schoolId == null || !Number.isFinite(Number(schoolId))) {
    return path;
  }

  const schoolParam = `school_id=${encodeURIComponent(String(schoolId))}`;
  if (/(?:^|[?&])school_id=/.test(path)) {
    return path;
  }
  return path.includes('?') ? `${path}&${schoolParam}` : `${path}?${schoolParam}`;
}

export function getAssessmentGenerationStageLabel(
  stage?: string | null,
  status?: string | null,
): string {
  const normalized = String(stage || status || '')
    .trim()
    .toLowerCase();
  if (!normalized || normalized === 'queued') return 'Preparing assessment…';
  if (normalized === 'retrieving' || normalized === 'planning') {
    return 'Preparing curriculum evidence…';
  }
  if (normalized === 'generating' || normalized === 'finalizing') {
    return 'Generating assessment…';
  }
  if (normalized === 'validating' || normalized === 'verifying' || normalized === 'repairing') {
    return 'Verifying curriculum alignment…';
  }
  if (normalized === 'completed' || normalized === 'persisted') return 'Generating assessment…';
  if (normalized === 'cancelling' || normalized === 'cancelled') return 'Cancelling assessment…';
  if (normalized === 'failed') return 'Assessment generation failed…';
  if (normalized === 'running') return 'Generating assessment…';
  return 'Preparing assessment…';
}

export function buildSavedBooksGenerateParams(args: {
  generationType?: SavedBooksGenerationType;
  board: SavedBooksDropdownItem;
  classItem: SavedBooksDropdownItem;
  subject: SavedBooksDropdownItem;
  topics: string[];
  subtopics: string[];
  language: string;
  difficulty: string;
  numQuestions: number;
  additionalInstructions: string;
  schoolId?: number;
  extra?: Partial<SavedBooksGenerateParams>;
}): SavedBooksGenerateParams {
  return {
    generation_type: args.generationType ?? 'assessment',
    board_id: args.board.id,
    board_name: args.board.label,
    class_id: args.classItem.id,
    class_name: args.classItem.label,
    subject_id: args.subject.id,
    subject_name: args.subject.label,
    topics: args.topics,
    subtopics: args.subtopics,
    language: args.language,
    difficulty: args.difficulty,
    num_questions: args.numQuestions,
    additional_instructions: args.additionalInstructions.trim(),
    school_id: args.schoolId,
    format_type: resolveSummaryFormat(args.subject.label || ''),
    ...args.extra,
  };
}

export function buildCurriculumSavedBooksGenerateParams(args: {
  generationType?: SavedBooksGenerationType;
  topics: string[];
  subtopics: string[];
  language: string;
  difficulty: string;
  numQuestions: number;
  additionalInstructions: string;
  schoolId?: number;
  curriculumContext: SavedBooksCurriculumContext;
  extra?: Partial<SavedBooksGenerateParams>;
}): SavedBooksGenerateParams {
  return {
    generation_type: args.generationType ?? 'assessment',
    topics: args.topics,
    subtopics: args.subtopics,
    language: args.language,
    difficulty: args.difficulty,
    num_questions: args.numQuestions,
    additional_instructions: args.additionalInstructions.trim() || undefined,
    school_id: args.schoolId,
    curriculum_context: {
      board_code: args.curriculumContext.board_code,
      grade_code: args.curriculumContext.grade_code,
      subject_code: args.curriculumContext.subject_code,
      version_label: args.curriculumContext.version_label || undefined,
      unit_code: args.curriculumContext.unit_code,
    },
    ...args.extra,
  };
}

export function fileFormValidationErrors(args: {
  board: SavedBooksDropdownItem | null;
  classItem: SavedBooksDropdownItem | null;
  subject: SavedBooksDropdownItem | null;
  topics: string[];
  difficulty: string;
  instructions: string;
}): string[] {
  const errors: string[] = [];
  if (!args.board) errors.push('Board is required');
  if (!args.classItem) errors.push('Class is required');
  if (!args.subject) errors.push('Subject is required');
  if (args.topics.length === 0) errors.push('Select at least one Topic');
  if (!args.difficulty) errors.push('Difficulty level is required');
  if (!args.instructions.trim()) errors.push('Additional instructions are required');
  return errors;
}

function newAssessmentIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (error != null &&
      typeof error === 'object' &&
      ((error as { name?: string }).name === 'AbortError' ||
        (error as { name?: string }).name === 'CanceledError' ||
        (error as { code?: string }).code === 'ERR_CANCELED'))
  );
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const reason =
      signal.reason instanceof Error ? signal.reason : new Error('Aborted');
    (reason as Error & { name: string }).name = 'AbortError';
    throw reason;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const reason =
        signal.reason instanceof Error ? signal.reason : new Error('Aborted');
      (reason as Error & { name: string }).name = 'AbortError';
      reject(reason);
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      const reason =
        signal?.reason instanceof Error ? signal.reason : new Error('Aborted');
      (reason as Error & { name: string }).name = 'AbortError';
      reject(reason);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function isAcceptedGenerationJob(data: unknown): data is SavedBooksGenerationJobAccepted {
  if (!data || typeof data !== 'object') return false;
  const row = data as Record<string, unknown>;
  return row.accepted === true && typeof row.job_id === 'string' && Boolean(row.job_id);
}

function isLegacySavedBooksGenerateResult(data: unknown): data is SavedBooksGenerateResult {
  if (!data || typeof data !== 'object') return false;
  const row = data as Record<string, unknown>;
  if (row.accepted === true) return false;
  return (
    row.success === true ||
    typeof row.generation_type === 'string' ||
    Array.isArray(row.quiz) ||
    Array.isArray(row.questions) ||
    row.worksheet != null ||
    row.summary != null ||
    row.lesson_plan != null ||
    row.flashcards != null
  );
}

function jobResultPayload(status: SavedBooksGenerationJobStatus): SavedBooksGenerateResult | null {
  const payload = status.result ?? status.result_payload;
  if (payload && typeof payload === 'object') return payload;
  return null;
}

export function isTransientGenerationStatusError(error: unknown): boolean {
  if (isAbortError(error)) return false;
  if (isAssessmentInfrastructureFailure(error)) return true;
  const code = extractCurriculumErrorCode(error);
  if (code === ASSESSMENT_DEPENDENCY_UNAVAILABLE_CODE) return true;
  const status =
    typeof error === 'object' && error !== null
      ? Number(
          (error as { status?: number; response?: { status?: number } }).status ??
            (error as { response?: { status?: number } }).response?.status,
        )
      : NaN;
  return status === 502 || status === 503 || status === 504;
}

function isTrueJobNotFoundError(error: unknown): boolean {
  const status =
    typeof error === 'object' && error !== null
      ? Number(
          (error as { status?: number; response?: { status?: number } }).status ??
            (error as { response?: { status?: number } }).response?.status,
        )
      : NaN;
  return status === 404;
}

function asJobErrorCode(code: unknown): string | null {
  return extractCurriculumErrorCode(typeof code === 'string' ? { code } : code);
}

function mapJobFailureToError(status: SavedBooksGenerationJobStatus): Error & { code?: string } {
  const code =
    (asJobErrorCode(status.error_code) as CurriculumGenerationErrorCode | null) ||
    extractCurriculumErrorCode({
      code: status.error_code,
      message: status.error_message || status.message,
    }) ||
    (status.status === 'cancelled'
      ? ASSESSMENT_GENERATION_CANCELLED_CODE
      : ASSESSMENT_GENERATION_FAILED_CODE);

  return createCurriculumGenerationError(
    code as CurriculumGenerationErrorCode,
    getCurriculumGenerationErrorMessage(
      { code, message: status.error_message || status.message },
      status.error_message ||
        status.message ||
        'Assessment generation failed. Please try again.',
    ),
  );
}

function rematerializeCurriculumError(error: unknown): never {
  if (isAbortError(error)) throw error;
  const code = extractCurriculumErrorCode(error);
  if (code) {
    throw createCurriculumGenerationError(
      code as CurriculumGenerationErrorCode,
      getCurriculumGenerationErrorMessage(error, 'Generation failed. Please try again.'),
    );
  }
  if (isAssessmentInfrastructureFailure(error)) {
    throw createCurriculumGenerationError(ASSESSMENT_DEPENDENCY_UNAVAILABLE_CODE);
  }
  if (isCurriculumVerificationFailedError(error)) {
    const err = new Error(CURRICULUM_VERIFICATION_FAILED_UI_MESSAGE) as Error & { code?: string };
    err.code = CURRICULUM_VERIFICATION_FAILED_CODE;
    throw err;
  }
  if (isCurriculumScopeNotAssessmentReadyError(error)) {
    const err = new Error(CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_UI_MESSAGE) as Error & {
      code?: string;
    };
    err.code = CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_CODE;
    throw err;
  }
  const message = getApiErrorMessage(error, 'Generation failed. Please try again.');
  if (typeof message === 'string' && message.includes(CURRICULUM_VERIFICATION_FAILED_BACKEND_MESSAGE)) {
    const err = new Error(CURRICULUM_VERIFICATION_FAILED_UI_MESSAGE) as Error & { code?: string };
    err.code = CURRICULUM_VERIFICATION_FAILED_CODE;
    throw err;
  }
  if (
    typeof message === 'string' &&
    message.includes(CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_BACKEND_MESSAGE)
  ) {
    const err = new Error(CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_UI_MESSAGE) as Error & {
      code?: string;
    };
    err.code = CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_CODE;
    throw err;
  }
  if (
    typeof message === 'string' &&
    (/^<!DOCTYPE\s+html/i.test(message.trim()) || /^<html[\s>]/i.test(message.trim()))
  ) {
    throw createCurriculumGenerationError(ASSESSMENT_DEPENDENCY_UNAVAILABLE_CODE);
  }
  throw new Error(message);
}

function unwrapDropdownItems(data: unknown): SavedBooksDropdownItem[] {
  const row = data as { items?: unknown; data?: { items?: unknown } } | unknown[];
  const items = Array.isArray(row)
    ? row
    : Array.isArray((row as { items?: unknown }).items)
      ? (row as { items: unknown[] }).items
      : Array.isArray((row as { data?: { items?: unknown[] } }).data?.items)
        ? (row as { data: { items: unknown[] } }).data.items
        : [];
  return items
    .map((item, index) => {
      if (typeof item === 'string' && item.trim()) {
        return { id: index + 1, label: item.trim() };
      }
      if (!item || typeof item !== 'object') return null;
      const rec = item as { id?: unknown; label?: unknown; slug?: unknown; name?: unknown };
      const labelRaw = rec.label ?? rec.name;
      const label = typeof labelRaw === 'string' ? labelRaw.trim() : String(labelRaw ?? '').trim();
      if (!label) return null;
      const id = Number(rec.id);
      return {
        id: Number.isFinite(id) ? id : index + 1,
        label,
        slug: typeof rec.slug === 'string' ? rec.slug : undefined,
      };
    })
    .filter((item): item is SavedBooksDropdownItem => item != null);
}

const savedBooksDropdownCache = new Map<string, SavedBooksDropdownItem[]>();
const fileModePrefsByScope = new Map<string, SavedBooksFileModePrefs>();

function prefsScopeKey(accountId?: string | number | null, schoolId?: number | null): string {
  return `${accountId ?? 'anon'}:${schoolId ?? 'all'}`;
}

export function resetSavedBooksServiceForTests(): void {
  savedBooksDropdownCache.clear();
  fileModePrefsByScope.clear();
}

async function getCachedSavedBooksDropdown(
  cacheKey: string,
  loader: () => Promise<SavedBooksDropdownItem[]>,
): Promise<SavedBooksDropdownItem[]> {
  const cached = savedBooksDropdownCache.get(cacheKey);
  if (cached) return cached;
  const items = await loader();
  savedBooksDropdownCache.set(cacheKey, items);
  return items;
}

export function getFileModePrefs(
  accountId?: string | number | null,
  schoolId?: number | null,
): SavedBooksFileModePrefs {
  const stored = fileModePrefsByScope.get(prefsScopeKey(accountId, schoolId));
  if (!stored) return { ...DEFAULT_FILE_MODE_PREFS, topics: [], subtopics: [] };
  return {
    ...DEFAULT_FILE_MODE_PREFS,
    ...stored,
    topics: Array.isArray(stored.topics) ? [...stored.topics] : [],
    subtopics: Array.isArray(stored.subtopics) ? [...stored.subtopics] : [],
    instructions: stored.instructions?.trim() || DEFAULT_FILE_MODE_PREFS.instructions,
  };
}

export function saveFileModePrefs(
  prefs: Partial<SavedBooksFileModePrefs>,
  accountId?: string | number | null,
  schoolId?: number | null,
): void {
  const key = prefsScopeKey(accountId, schoolId);
  const current = getFileModePrefs(accountId, schoolId);
  fileModePrefsByScope.set(key, {
    ...current,
    ...prefs,
    topics: prefs.topics ?? current.topics,
    subtopics: prefs.subtopics ?? current.subtopics,
  });
}

export async function getSavedBooksBoards(
  schoolId?: number,
  accountId?: string | number | null,
): Promise<SavedBooksDropdownItem[]> {
  const cacheKey = buildSavedBooksCacheKey('boards', schoolId, [], accountId);
  return getCachedSavedBooksDropdown(cacheKey, async () => {
    const res = await apiClient.get(buildSavedBooksBoardsPath(schoolId));
    return unwrapDropdownItems(res.data);
  });
}

/**
 * Preserve distinct selectable class IDs for downstream subjects/topics.
 * Only collapse exact duplicate IDs. When labels collide across different IDs,
 * disambiguate the display label with stable metadata (id) — do not discard rows.
 */
export function normalizeSavedBooksClassOptions(
  items: SavedBooksDropdownItem[],
): SavedBooksDropdownItem[] {
  const byId = new Map<number, SavedBooksDropdownItem>();
  for (const item of items) {
    if (!byId.has(item.id)) {
      byId.set(item.id, { ...item });
    }
  }
  const unique = Array.from(byId.values());
  const labelCounts = new Map<string, number>();
  for (const item of unique) {
    const key = item.label.trim().toLowerCase();
    labelCounts.set(key, (labelCounts.get(key) || 0) + 1);
  }
  return unique.map((item) => {
    const key = item.label.trim().toLowerCase();
    if ((labelCounts.get(key) || 0) <= 1) return item;
    const grade = normalizeGradeToken(item.label);
    const base = grade ? `Class ${grade}` : item.label.trim();
    return {
      ...item,
      label: `${base} (#${item.id})`,
    };
  });
}

/** @deprecated use normalizeSavedBooksClassOptions — kept for test name stability during review. */
export function dedupeSavedBooksClassesByGrade(
  items: SavedBooksDropdownItem[],
): SavedBooksDropdownItem[] {
  return normalizeSavedBooksClassOptions(items);
}

export async function getSavedBooksClasses(
  boardId: number,
  schoolId?: number,
  accountId?: string | number | null,
): Promise<SavedBooksDropdownItem[]> {
  const cacheKey = buildSavedBooksCacheKey('classes', schoolId, [boardId], accountId);
  return getCachedSavedBooksDropdown(cacheKey, async () => {
    const res = await apiClient.get(buildSavedBooksClassesPath(boardId, schoolId));
    return normalizeSavedBooksClassOptions(unwrapDropdownItems(res.data));
  });
}

export async function getSavedBooksSubjects(
  boardId: number,
  classId: number,
  schoolId?: number,
  accountId?: string | number | null,
): Promise<SavedBooksDropdownItem[]> {
  const cacheKey = buildSavedBooksCacheKey('subjects', schoolId, [boardId, classId], accountId);
  return getCachedSavedBooksDropdown(cacheKey, async () => {
    const res = await apiClient.get(buildSavedBooksSubjectsPath(boardId, classId, schoolId));
    return unwrapDropdownItems(res.data);
  });
}

export async function getSavedBooksTopics(
  boardId: number,
  classId: number,
  subjectId: number,
  schoolId?: number,
  accountId?: string | number | null,
): Promise<SavedBooksDropdownItem[]> {
  const cacheKey = buildSavedBooksCacheKey(
    'topics',
    schoolId,
    [boardId, classId, subjectId],
    accountId,
  );
  return getCachedSavedBooksDropdown(cacheKey, async () => {
    const res = await apiClient.get(
      buildSavedBooksTopicsPath(boardId, classId, subjectId, schoolId),
    );
    return unwrapDropdownItems(res.data);
  });
}

export async function getSavedBooksSubtopics(
  boardId: number,
  classId: number,
  subjectId: number,
  topics?: string[],
  schoolId?: number,
  accountId?: string | number | null,
): Promise<SavedBooksDropdownItem[]> {
  const topicKey = (topics || []).slice().sort().join('|');
  const cacheKey = buildSavedBooksCacheKey(
    'subtopics',
    schoolId,
    [boardId, classId, subjectId, topicKey],
    accountId,
  );
  return getCachedSavedBooksDropdown(cacheKey, async () => {
    const res = await apiClient.get(
      buildSavedBooksSubtopicsPath(boardId, classId, subjectId, topics, schoolId),
    );
    return unwrapDropdownItems(res.data);
  });
}

export async function getSavedBooksCurriculumRefinements(
  params: SavedBooksCurriculumRefinementsParams,
): Promise<SavedBooksCurriculumRefinementsResult> {
  const res = await apiClient.get(buildSavedBooksCurriculumRefinementsPath(params));
  const data = (res.data || {}) as SavedBooksCurriculumRefinementsResult;
  return {
    success: data.success,
    topics: unwrapDropdownItems(data.topics ? { items: data.topics } : data),
    subtopics: unwrapDropdownItems(
      Array.isArray(data.subtopics) ? { items: data.subtopics } : { items: [] },
    ),
    matched_content_count: data.matched_content_count,
  };
}

export async function pollSavedBooksGenerationJob(
  jobId: string,
  options: {
    signal?: AbortSignal;
    onStage?: (stage: string | undefined, status: string | undefined) => void;
    initialPollAfterMs?: number;
    statusUrl?: string;
    schoolId?: number;
  } = {},
): Promise<SavedBooksGenerateResult> {
  const statusPath = buildTrustedGenerationJobStatusPath(jobId, options.statusUrl, options.schoolId);

  let delayMs = Math.min(
    Math.max(options.initialPollAfterMs ?? ASSESSMENT_GENERATION_POLL_INITIAL_MS, ASSESSMENT_GENERATION_POLL_INITIAL_MS),
    ASSESSMENT_GENERATION_POLL_MAX_MS,
  );
  const startedAt = Date.now();

  await sleep(delayMs, options.signal);
  delayMs = Math.min(delayMs * 2, ASSESSMENT_GENERATION_POLL_MAX_MS);

  for (;;) {
    throwIfAborted(options.signal);
    if (Date.now() - startedAt > ASSESSMENT_GENERATION_POLL_MAX_DURATION_MS) {
      throw createCurriculumGenerationError(ASSESSMENT_GENERATION_TIMEOUT_CODE);
    }

    let status: SavedBooksGenerationJobStatus;
    try {
      const res = await apiClient.get(statusPath, { signal: options.signal });
      status = res.data as SavedBooksGenerationJobStatus;
    } catch (error) {
      if (isAbortError(error)) throw error;
      if (isTransientGenerationStatusError(error) && !isTrueJobNotFoundError(error)) {
        const retryDelay = Math.min(
          Math.max(delayMs, ASSESSMENT_GENERATION_POLL_INITIAL_MS),
          ASSESSMENT_GENERATION_POLL_MAX_MS,
        );
        await sleep(retryDelay, options.signal);
        delayMs = Math.min(delayMs * 2, ASSESSMENT_GENERATION_POLL_MAX_MS);
        continue;
      }
      rematerializeCurriculumError(error);
    }

    options.onStage?.(status.stage, status.status);

    const normalized = String(status.status || '').toLowerCase();
    if (normalized === 'persisted') {
      const result = jobResultPayload(status);
      if (!result) {
        throw createCurriculumGenerationError(ASSESSMENT_GENERATION_FAILED_CODE);
      }
      return result;
    }
    if (normalized === 'failed' || normalized === 'cancelled') {
      throw mapJobFailureToError(status);
    }

    const nextDelay = Math.min(
      Math.max(status.poll_after_ms ?? delayMs, ASSESSMENT_GENERATION_POLL_INITIAL_MS),
      ASSESSMENT_GENERATION_POLL_MAX_MS,
    );
    await sleep(nextDelay, options.signal);
    delayMs = Math.min(delayMs * 2, ASSESSMENT_GENERATION_POLL_MAX_MS);
  }
}

export async function generateFromSavedBooks(
  params: SavedBooksGenerateParams,
  options: GenerateFromSavedBooksOptions = {},
): Promise<SavedBooksGenerateResult> {
  const idempotencyKey = options.idempotencyKey || newAssessmentIdempotencyKey();
  try {
    throwIfAborted(options.signal);
    const response = await apiClient.post(SAVED_BOOKS_GENERATE_PATH, params, {
      signal: options.signal,
      timeout: GENERATE_POST_TIMEOUT_MS,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    const data = response.data as SavedBooksGenerateResult | SavedBooksGenerationJobAccepted;

    if (isAcceptedGenerationJob(data)) {
      options.onJobAccepted?.(data.job_id);
      options.onStage?.(data.stage, data.status);
      return await pollSavedBooksGenerationJob(data.job_id, {
        signal: options.signal,
        onStage: options.onStage,
        initialPollAfterMs: data.poll_after_ms,
        statusUrl: data.status_url,
        schoolId: params.school_id,
      });
    }

    if (isLegacySavedBooksGenerateResult(data)) {
      return data;
    }

    throw createCurriculumGenerationError(ASSESSMENT_GENERATION_FAILED_CODE);
  } catch (error) {
    rematerializeCurriculumError(error);
  }
}

export async function cancelGenerationJob(
  jobId: string,
  schoolId?: number | null,
): Promise<void> {
  if (!jobId?.trim()) return;
  const query =
    schoolId != null && Number.isFinite(Number(schoolId))
      ? `?school_id=${encodeURIComponent(String(schoolId))}`
      : '';
  try {
    await apiClient.post(
      `/api/v1/content/saved-books/generation-jobs/${encodeURIComponent(jobId.trim())}/cancel${query}`,
      schoolId != null ? { school_id: schoolId } : undefined,
    );
  } catch {
    // Best-effort — ignore cancel failures (already finished / network).
  }
}

export const MISSING_ALIGNMENT_METADATA_MESSAGE =
  'The assessment was generated without curriculum alignment metadata and cannot be presented as curriculum-aligned.';
