/**
 * Shared quiz-question sanitization used before navigation to QuizTakingScreen
 * and when restoring saved assessments. Prevents crashes from malformed API payloads.
 */

import { resolveCorrectOptionIndex } from './optionIdentity';

export interface SanitizedQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  answer: string;
  explanation: string | null;
  verification_level?: string;
  original_item_index?: number;
  slot_id?: string;
  /** Set when options were shuffled/normalized at generation time (web parity). */
  optionsNormalized?: boolean;
  correctOptionIndex?: number;
  optionOrder?: number[];
  originalOptions?: string[];
  gradingFrozen?: boolean;
  attendedIsCorrect?: boolean | null;
}

/** Unwrap nested { quiz: { question, options, answer } } history format. */
function unwrapQuestionItem(item: any): any {
  if (!item || typeof item !== 'object') return item;
  if (item.quiz && typeof item.quiz === 'object' && item.quiz.question != null) {
    return {
      ...item,
      question: item.quiz.question,
      options: item.quiz.options ?? item.options,
      correctAnswer: item.quiz.answer ?? item.quiz.correctAnswer ?? item.correctAnswer ?? item.answer,
      answer: item.quiz.answer ?? item.answer ?? item.correctAnswer,
      explanation: item.quiz.explanation ?? item.explanation ?? null,
    };
  }
  return item;
}

/**
 * Coerce a single API/history question into a safe shape.
 * Returns null when the question cannot be displayed (missing text or options).
 */
export function sanitizeQuizQuestion(item: any, idx: number): SanitizedQuizQuestion | null {
  const raw = unwrapQuestionItem(item);
  if (!raw) return null;

  const question =
    typeof raw.question === 'string'
      ? raw.question.trim()
      : String(raw.question ?? '').trim();

  const options = Array.isArray(raw.options)
    ? raw.options.map((o: unknown) => String(o ?? '').trim()).filter((o: string) => o.length > 0)
    : [];

  if (!question || options.length === 0) return null;

  const rawCorrect = String(raw.correctAnswer ?? raw.answer ?? '').trim();
  const correctOptionIndex =
    typeof raw.correctOptionIndex === 'number'
      ? raw.correctOptionIndex
      : resolveCorrectOptionIndex(rawCorrect, options);
  if (correctOptionIndex == null || correctOptionIndex < 0 || correctOptionIndex >= options.length) {
    if (typeof raw.attendedIsCorrect !== 'boolean' && !rawCorrect) return null;
  }
  const correct =
    correctOptionIndex != null && correctOptionIndex >= 0 && correctOptionIndex < options.length
      ? options[correctOptionIndex]
      : rawCorrect;

  return {
    id: String(raw.id ?? `q-${idx}`),
    question,
    options,
    correctAnswer: correct,
    answer: correct,
    correctOptionIndex:
      correctOptionIndex != null && correctOptionIndex >= 0 && correctOptionIndex < options.length
        ? correctOptionIndex
        : undefined,
    optionOrder: Array.isArray(raw.optionOrder) ? raw.optionOrder : undefined,
    originalOptions: Array.isArray(raw.originalOptions) ? raw.originalOptions : undefined,
    gradingFrozen: raw.gradingFrozen === true || raw.isHistoricalResult === true,
    attendedIsCorrect:
      typeof raw.attendedIsCorrect === 'boolean'
        ? raw.attendedIsCorrect
        : typeof raw.is_correct === 'boolean'
          ? raw.is_correct
          : null,
    explanation:
      typeof raw.explanation === 'string'
        ? raw.explanation
        : raw.explanation != null
          ? String(raw.explanation)
          : null,
    optionsNormalized: raw.optionsNormalized === true,
    verification_level:
      typeof raw.verification_level === 'string' ? raw.verification_level : undefined,
    original_item_index:
      typeof raw.original_item_index === 'number' ? raw.original_item_index : undefined,
    slot_id: typeof raw.slot_id === 'string' ? raw.slot_id : undefined,
  };
}

/** Sanitize an array of questions; drops entries that are not playable. */
export function sanitizeQuizQuestions(questions: unknown): SanitizedQuizQuestion[] {
  if (!Array.isArray(questions)) return [];
  return questions
    .map((item, idx) => sanitizeQuizQuestion(item, idx))
    .filter((q): q is SanitizedQuizQuestion => q !== null);
}
