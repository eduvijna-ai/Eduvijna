/**
 * Shared quiz-question sanitization used before navigation to QuizTakingScreen
 * and when restoring saved assessments. Prevents crashes from malformed API payloads.
 */

export interface SanitizedQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  answer: string;
  explanation: string | null;
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

  const correct =
    String(raw.correctAnswer ?? raw.answer ?? 'A').trim() || 'A';

  return {
    id: String(raw.id ?? `q-${idx}`),
    question,
    options,
    correctAnswer: correct,
    answer: correct,
    explanation:
      typeof raw.explanation === 'string'
        ? raw.explanation
        : raw.explanation != null
          ? String(raw.explanation)
          : null,
  };
}

/** Sanitize an array of questions; drops entries that are not playable. */
export function sanitizeQuizQuestions(questions: unknown): SanitizedQuizQuestion[] {
  if (!Array.isArray(questions)) return [];
  return questions
    .map((item, idx) => sanitizeQuizQuestion(item, idx))
    .filter((q): q is SanitizedQuizQuestion => q !== null);
}
