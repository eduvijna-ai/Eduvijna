/**
 * Display helpers for quiz list rows (omit unknown derived fields).
 */

export function formatVerifiedCorrectAnswerCount(quiz: {
  correct_answers?: unknown;
  question_count?: number | null;
}): string {
  if (typeof quiz.correct_answers !== 'number' || !Number.isFinite(quiz.correct_answers)) {
    return '';
  }
  const total = quiz.question_count;
  if (total == null || !Number.isFinite(total) || total <= 0) {
    return '';
  }
  return `${quiz.correct_answers}/${total}`;
}
