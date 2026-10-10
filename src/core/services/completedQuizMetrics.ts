import type { QuizResultLoadState } from './quizResultRetrieval.service';
import { isQuizAnswerCorrect } from '../utils/answerMappingUtils';

type LogAnswerEntry = {
  isCorrect?: boolean;
  userAnswer?: string | null;
  user_answer?: string | null;
  selected_option?: string | null;
};

function countCorrectFromLogMetadata(logData: Record<string, unknown> | null): number | undefined {
  if (!logData) return undefined;
  const answers = logData.answers;
  if (!Array.isArray(answers) || answers.length === 0) return undefined;
  const entries = answers as LogAnswerEntry[];
  const withFlags = entries.filter((e) => typeof e.isCorrect === 'boolean');
  if (withFlags.length === 0) return undefined;
  return withFlags.filter((e) => e.isCorrect).length;
}

/**
 * Derive verified correct-answer count from persisted result metadata or answer mapping.
 * Never treats non-empty user answers as correct without verification.
 */
export function countCorrectAnswersFromPersistedResult(
  result: Extract<QuizResultLoadState, { status: 'ready' }>,
): number | undefined {
  const fromLog = countCorrectFromLogMetadata(result.logData);
  if (fromLog !== undefined) return fromLog;

  const questions = result.quizData?.questions ?? [];
  if (!questions.length || !result.userAnswers?.length) return undefined;

  let correct = 0;
  let evaluated = 0;
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const selected = result.userAnswers[i];
    if (!selected || !String(selected).trim()) continue;
    evaluated += 1;
    if (isQuizAnswerCorrect(selected, question)) correct += 1;
  }
  return evaluated > 0 ? correct : undefined;
}

export function completedRowNeedsHydration(quiz: {
  status?: string;
  score?: number | null;
  time_spent_seconds?: number | null;
  completed_at?: string | null;
  correct_answers?: number;
}): boolean {
  if (quiz.status !== 'completed') {
    return false;
  }
  const hasScore = quiz.score != null && Number.isFinite(quiz.score);
  const hasTime = quiz.time_spent_seconds != null && Number.isFinite(quiz.time_spent_seconds);
  const hasCompletedAt =
    quiz.completed_at != null && String(quiz.completed_at).trim().length > 0;
  const hasCorrect = typeof quiz.correct_answers === 'number';
  return !hasScore || !hasTime || !hasCompletedAt || !hasCorrect;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const concurrency = Math.max(1, Math.min(limit, items.length));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}
