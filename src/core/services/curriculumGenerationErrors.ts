/**
 * Curriculum / saved-books generation error contract from Quiz-React curriculumAssessmentService.
 */

export const CURRICULUM_VERIFICATION_FAILED_CODE = 'curriculum_verification_failed';
export const CURRICULUM_VERIFICATION_FAILED_UI_MESSAGE =
  'EduVijna could not verify every generated question against the selected curriculum. Please generate again.';
export const CURRICULUM_VERIFICATION_FAILED_BACKEND_MESSAGE =
  'The assessment could not be fully verified against the selected curriculum.';

export const CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_CODE =
  'curriculum_scope_not_assessment_ready';
export const CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_UI_MESSAGE =
  'This curriculum selection is not yet ready for verified assessment generation. Please choose another unit or curriculum.';
export const CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_BACKEND_MESSAGE =
  'The selected curriculum scope does not yet contain sufficient authoritative assessment mappings.';

export const ASSESSMENT_GENERATION_TIMEOUT_CODE = 'assessment_generation_timeout';
export const ASSESSMENT_GENERATION_TIMEOUT_UI_MESSAGE =
  'Assessment generation timed out. Please try again.';

export const ASSESSMENT_PROVIDER_UNAVAILABLE_CODE = 'assessment_provider_unavailable';
export const ASSESSMENT_PROVIDER_UNAVAILABLE_UI_MESSAGE =
  'The assessment provider is temporarily unavailable. Please try again shortly.';

export const ASSESSMENT_DEPENDENCY_UNAVAILABLE_CODE = 'assessment_dependency_unavailable';
export const ASSESSMENT_DEPENDENCY_UNAVAILABLE_UI_MESSAGE =
  'Assessment generation is temporarily unavailable due to a system issue. Please try again shortly.';

export const ASSESSMENT_GENERATION_FAILED_CODE = 'assessment_generation_failed';
export const ASSESSMENT_GENERATION_FAILED_UI_MESSAGE =
  'Assessment generation failed. Please try again.';

export const ASSESSMENT_RETRIEVAL_FAILED_CODE = 'assessment_retrieval_failed';
export const ASSESSMENT_RETRIEVAL_FAILED_UI_MESSAGE =
  'No authorized school library content matched this curriculum unit. Confirm the source book is actively assigned to your school and indexed, then try again.';

export const ASSESSMENT_GENERATION_CANCELLED_CODE = 'assessment_generation_cancelled';
export const ASSESSMENT_GENERATION_CANCELLED_UI_MESSAGE =
  'Assessment generation was cancelled.';

export const GENERATION_IDEMPOTENCY_CONFLICT_CODE = 'generation_idempotency_conflict';
export const GENERATION_IDEMPOTENCY_CONFLICT_UI_MESSAGE =
  'A conflicting assessment generation request is already in progress. Please try again.';

const RECOGNIZED_CURRICULUM_GENERATION_ERROR_CODES = [
  CURRICULUM_VERIFICATION_FAILED_CODE,
  CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_CODE,
  ASSESSMENT_GENERATION_TIMEOUT_CODE,
  ASSESSMENT_PROVIDER_UNAVAILABLE_CODE,
  ASSESSMENT_DEPENDENCY_UNAVAILABLE_CODE,
  ASSESSMENT_RETRIEVAL_FAILED_CODE,
  ASSESSMENT_GENERATION_FAILED_CODE,
  ASSESSMENT_GENERATION_CANCELLED_CODE,
  GENERATION_IDEMPOTENCY_CONFLICT_CODE,
] as const;

export type CurriculumGenerationErrorCode =
  (typeof RECOGNIZED_CURRICULUM_GENERATION_ERROR_CODES)[number];

const CURRICULUM_GENERATION_ERROR_UI_MESSAGES: Record<
  CurriculumGenerationErrorCode,
  string
> = {
  [CURRICULUM_VERIFICATION_FAILED_CODE]: CURRICULUM_VERIFICATION_FAILED_UI_MESSAGE,
  [CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_CODE]:
    CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_UI_MESSAGE,
  [ASSESSMENT_GENERATION_TIMEOUT_CODE]: ASSESSMENT_GENERATION_TIMEOUT_UI_MESSAGE,
  [ASSESSMENT_PROVIDER_UNAVAILABLE_CODE]: ASSESSMENT_PROVIDER_UNAVAILABLE_UI_MESSAGE,
  [ASSESSMENT_DEPENDENCY_UNAVAILABLE_CODE]: ASSESSMENT_DEPENDENCY_UNAVAILABLE_UI_MESSAGE,
  [ASSESSMENT_RETRIEVAL_FAILED_CODE]: ASSESSMENT_RETRIEVAL_FAILED_UI_MESSAGE,
  [ASSESSMENT_GENERATION_FAILED_CODE]: ASSESSMENT_GENERATION_FAILED_UI_MESSAGE,
  [ASSESSMENT_GENERATION_CANCELLED_CODE]: ASSESSMENT_GENERATION_CANCELLED_UI_MESSAGE,
  [GENERATION_IDEMPOTENCY_CONFLICT_CODE]: GENERATION_IDEMPOTENCY_CONFLICT_UI_MESSAGE,
};

function matchRecognizedCurriculumErrorText(text: string): string | null {
  if (
    text.includes(CURRICULUM_VERIFICATION_FAILED_CODE) ||
    text.includes(CURRICULUM_VERIFICATION_FAILED_BACKEND_MESSAGE) ||
    text.includes(CURRICULUM_VERIFICATION_FAILED_UI_MESSAGE)
  ) {
    return CURRICULUM_VERIFICATION_FAILED_CODE;
  }
  if (
    text.includes(CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_CODE) ||
    text.includes(CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_BACKEND_MESSAGE) ||
    text.includes(CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_UI_MESSAGE)
  ) {
    return CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_CODE;
  }
  const lowered = text.toLowerCase();
  if (
    text.includes(ASSESSMENT_RETRIEVAL_FAILED_CODE) ||
    text.includes(ASSESSMENT_RETRIEVAL_FAILED_UI_MESSAGE) ||
    lowered.includes('no relevant instructional saved-book content') ||
    lowered.includes('no authorized school-library content') ||
    lowered.includes('no school-library vector matches')
  ) {
    return ASSESSMENT_RETRIEVAL_FAILED_CODE;
  }
  for (const code of RECOGNIZED_CURRICULUM_GENERATION_ERROR_CODES) {
    if (
      code !== CURRICULUM_VERIFICATION_FAILED_CODE &&
      code !== CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_CODE &&
      text.includes(code)
    ) {
      return code;
    }
  }
  for (const [code, uiMessage] of Object.entries(CURRICULUM_GENERATION_ERROR_UI_MESSAGES)) {
    if (
      code !== CURRICULUM_VERIFICATION_FAILED_CODE &&
      code !== CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_CODE &&
      text.includes(uiMessage)
    ) {
      return code as CurriculumGenerationErrorCode;
    }
  }
  return null;
}

function asRecognizedCurriculumErrorCode(code: unknown): string | null {
  if (typeof code !== 'string') return null;
  const trimmed = code.trim();
  return (RECOGNIZED_CURRICULUM_GENERATION_ERROR_CODES as readonly string[]).includes(trimmed)
    ? trimmed
    : null;
}

function readHttpStatus(error: unknown): number {
  if (!error || typeof error !== 'object') return NaN;
  const err = error as { status?: number; response?: { status?: number } };
  return Number(err.status ?? err.response?.status);
}

export function isAssessmentInfrastructureFailure(error: unknown): boolean {
  if (!error) return false;
  const status = readHttpStatus(error);
  if (status === 502 || status === 503 || status === 504) return true;

  const blobs: string[] = [];
  if (typeof error === 'string') blobs.push(error);
  if (error && typeof error === 'object') {
    const err = error as {
      message?: string;
      statusText?: string;
      data?: unknown;
      response?: { data?: unknown };
    };
    if (typeof err.message === 'string') blobs.push(err.message);
    if (typeof err.statusText === 'string') blobs.push(err.statusText);
    if (typeof err.data === 'string') blobs.push(err.data);
    if (typeof err.response?.data === 'string') blobs.push(err.response.data);
  }
  for (const blob of blobs) {
    const trimmed = blob.trim();
    if (!trimmed) continue;
    if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return true;
    if (/nginx/i.test(trimmed) && /504|502|503|Gateway Time-?out/i.test(trimmed)) return true;
  }
  return false;
}

export function extractCurriculumErrorCode(error: unknown): string | null {
  if (!error) return null;
  if (isAssessmentInfrastructureFailure(error)) {
    return ASSESSMENT_DEPENDENCY_UNAVAILABLE_CODE;
  }
  if (typeof error === 'string') {
    return matchRecognizedCurriculumErrorText(error);
  }
  if (typeof error !== 'object') return null;

  const err = error as {
    code?: string;
    message?: string;
    data?: { detail?: unknown; code?: string; message?: string };
    response?: { status?: number; data?: { detail?: unknown; code?: string } };
    detail?: unknown;
  };

  const detailCandidates: unknown[] = [
    err.detail,
    err.data?.detail,
    err.response?.data?.detail,
  ];
  for (const detail of detailCandidates) {
    if (detail && typeof detail === 'object') {
      const recognized = asRecognizedCurriculumErrorCode((detail as { code?: string }).code);
      if (recognized) return recognized;
      const detailMessage = (detail as { message?: string }).message;
      if (typeof detailMessage === 'string') {
        const fromMessage = matchRecognizedCurriculumErrorText(detailMessage);
        if (fromMessage) return fromMessage;
      }
    } else if (typeof detail === 'string') {
      const fromDetail = matchRecognizedCurriculumErrorText(detail);
      if (fromDetail) return fromDetail;
    }
  }

  const topLevelCode = asRecognizedCurriculumErrorCode(err.code);
  if (topLevelCode) return topLevelCode;
  const dataCode = asRecognizedCurriculumErrorCode(err.data?.code);
  if (dataCode) return dataCode;
  const responseDataCode = asRecognizedCurriculumErrorCode(err.response?.data?.code);
  if (responseDataCode) return responseDataCode;
  if (typeof err.message === 'string') {
    const fromMessage = matchRecognizedCurriculumErrorText(err.message);
    if (fromMessage) return fromMessage;
  }
  if (typeof err.data?.message === 'string') {
    const fromDataMessage = matchRecognizedCurriculumErrorText(err.data.message);
    if (fromDataMessage) return fromDataMessage;
  }
  return null;
}

export function isCurriculumVerificationFailedError(error: unknown): boolean {
  return extractCurriculumErrorCode(error) === CURRICULUM_VERIFICATION_FAILED_CODE;
}

export function isCurriculumScopeNotAssessmentReadyError(error: unknown): boolean {
  return extractCurriculumErrorCode(error) === CURRICULUM_SCOPE_NOT_ASSESSMENT_READY_CODE;
}

export function createCurriculumGenerationError(
  code: CurriculumGenerationErrorCode,
  message?: string,
): Error & { code: CurriculumGenerationErrorCode } {
  const err = new Error(
    message || CURRICULUM_GENERATION_ERROR_UI_MESSAGES[code],
  ) as Error & { code: CurriculumGenerationErrorCode };
  err.code = code;
  return err;
}

function sanitizeSafeGenerationErrorMessage(raw: string): string | null {
  const text = String(raw || '').trim();
  if (!text) return null;
  const lowered = text.toLowerCase();
  if (
    lowered.includes('<html') ||
    lowered.includes('<!doctype') ||
    lowered.includes('traceback') ||
    lowered.includes('api key') ||
    lowered.includes('authorization') ||
    lowered.includes('bearer ') ||
    /(?:^|[^a-z])sk-[a-z0-9]/i.test(text) ||
    lowered.includes('password') ||
    /\bsecret\b/i.test(text) ||
    (lowered.includes('nginx') && /504|502|503|gateway/.test(lowered))
  ) {
    return null;
  }
  return text.length > 500 ? `${text.slice(0, 497)}...` : text;
}

function extractRawErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    if (typeof error === 'string' && error.trim()) return error.trim();
    return null;
  }
  const err = error as {
    message?: string;
    error_message?: string;
    data?: { message?: string; detail?: unknown; error_message?: string };
    detail?: unknown;
    response?: { data?: { detail?: unknown; message?: string; error_message?: string } };
  };
  const detailCandidates = [err.detail, err.data?.detail, err.response?.data?.detail];
  const detailMessages = detailCandidates.map((detail) => {
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object') {
      return (
        (detail as { message?: string; error_message?: string }).message ||
        (detail as { error_message?: string }).error_message
      );
    }
    return undefined;
  });
  const candidates = [
    err.error_message,
    err.data?.error_message,
    err.response?.data?.error_message,
    ...detailMessages,
    err.message,
    err.data?.message,
    err.response?.data?.message,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

export function getCurriculumGenerationErrorMessage(error: unknown, fallback: string): string {
  const code = extractCurriculumErrorCode(error);
  if (code === ASSESSMENT_GENERATION_FAILED_CODE) {
    const safe = sanitizeSafeGenerationErrorMessage(extractRawErrorMessage(error) || '');
    if (safe && safe !== ASSESSMENT_GENERATION_FAILED_UI_MESSAGE) return safe;
    return ASSESSMENT_GENERATION_FAILED_UI_MESSAGE;
  }
  if (code && code in CURRICULUM_GENERATION_ERROR_UI_MESSAGES) {
    return CURRICULUM_GENERATION_ERROR_UI_MESSAGES[code as CurriculumGenerationErrorCode];
  }
  if (isAssessmentInfrastructureFailure(error)) {
    return ASSESSMENT_DEPENDENCY_UNAVAILABLE_UI_MESSAGE;
  }
  return fallback;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const fromCurriculum = getCurriculumGenerationErrorMessage(error, '');
  if (fromCurriculum && fromCurriculum !== fallback && extractCurriculumErrorCode(error)) {
    return fromCurriculum;
  }
  const raw = extractRawErrorMessage(error);
  const safe = raw ? sanitizeSafeGenerationErrorMessage(raw) : null;
  return safe || fallback;
}
