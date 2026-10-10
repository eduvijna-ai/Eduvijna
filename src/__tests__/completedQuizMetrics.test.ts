import {
  countCorrectAnswersFromPersistedResult,
  mapWithConcurrency,
} from '../core/services/completedQuizMetrics';

describe('completedQuizMetrics', () => {
  it('counts correct from log isCorrect metadata', () => {
    const count = countCorrectAnswersFromPersistedResult({
      status: 'ready',
      quizData: { questions: [] },
      userAnswers: ['A', 'B'],
      score: 50,
      logData: {
        answers: [
          { isCorrect: true },
          { isCorrect: false },
          { isCorrect: true },
        ],
      },
      timeSpentSeconds: 10,
      completedAt: '2026-01-01T00:00:00Z',
    });
    expect(count).toBe(2);
  });

  it('uses answer mapping when metadata flags are absent', () => {
    const count = countCorrectAnswersFromPersistedResult({
      status: 'ready',
      quizData: {
        questions: [
          { question: 'Q1', options: ['A', 'B'], correctAnswer: 'A', answer: 'A' },
          { question: 'Q2', options: ['X', 'Y'], correctAnswer: 'Y', answer: 'Y' },
        ],
      },
      userAnswers: ['A', 'X'],
      score: 50,
      logData: null,
      timeSpentSeconds: 10,
      completedAt: '2026-01-01T00:00:00Z',
    });
    expect(count).toBe(1);
  });

  it('returns undefined when answers are unanswered', () => {
    const count = countCorrectAnswersFromPersistedResult({
      status: 'ready',
      quizData: {
        questions: [{ question: 'Q1', options: ['A', 'B'], correctAnswer: 'A', answer: 'A' }],
      },
      userAnswers: [''],
      score: null,
      logData: null,
      timeSpentSeconds: null,
      completedAt: null,
    });
    expect(count).toBeUndefined();
  });

  it('mapWithConcurrency preserves order under load', async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => n * 2);
    expect(out).toEqual([2, 4, 6, 8, 10]);
  });
});
