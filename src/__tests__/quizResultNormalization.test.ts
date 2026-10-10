import {
  normalizeQuestionsAndAnswersFromLogData,
  resolvePersistedScore,
} from '../core/services/quizResultNormalization';

describe('quizResultNormalization', () => {
  it('reconstructs questions and answers from log_data.answers', () => {
    const normalized = normalizeQuestionsAndAnswersFromLogData({
      answers: [
        {
          questionNumber: 1,
          question: '2+2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 'B',
          userAnswer: 'B',
          isCorrect: true,
        },
        {
          questionNumber: 2,
          question: '3+3?',
          options: ['5', '6', '7', '8'],
          correctAnswer: 'B',
          userAnswer: null,
          isCorrect: false,
        },
      ],
      score: 50,
    });

    expect(normalized?.questions).toHaveLength(2);
    expect(normalized?.questions[0].question).toBe('2+2?');
    expect(normalized?.userAnswers[0]).toBe('4');
    expect(normalized?.userAnswers[1]).toBe('');
    expect(normalized?.score).toBe(50);
  });

  it('preserves score 0 and keeps absent score null', () => {
    expect(resolvePersistedScore(0, null)).toBe(0);
    expect(resolvePersistedScore(undefined, null)).toBeNull();
    expect(resolvePersistedScore(undefined, { score: 0 })).toBe(0);
  });
});
