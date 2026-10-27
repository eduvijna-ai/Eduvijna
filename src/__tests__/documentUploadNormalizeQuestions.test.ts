import {
  extractQuestionsPayload,
  normalizeQuestions,
} from '../core/services/documentUploadApi';

describe('documentUploadApi question normalization (Issue 3)', () => {
  it('accepts flat API questions with letter keys', () => {
    const out = normalizeQuestions([
      {
        question: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        answer: 'B',
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].correctAnswer).toBe('B');
  });

  it('preserves full-text correct answers instead of inventing A', () => {
    const out = normalizeQuestions([
      {
        question: 'Capital of France?',
        options: ['Berlin', 'Paris', 'Rome', 'Madrid'],
        correctAnswer: 'Paris',
      },
    ]);
    expect(out[0].correctAnswer).toBe('Paris');
  });

  it('unwraps nested quiz.* shapes used by some API payloads', () => {
    const out = normalizeQuestions([
      {
        quiz: {
          question: 'Nested Q',
          options: ['A1', 'A2', 'A3', 'A4'],
          answer: 'C',
        },
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].question).toBe('Nested Q');
    expect(out[0].correctAnswer).toBe('C');
  });

  it('extracts questions from heterogeneous payloads', () => {
    expect(
      extractQuestionsPayload({
        questions: { quizzes: [{ question: 'Q', options: ['a', 'b'], answer: 'A' }] },
      }),
    ).toHaveLength(1);
    expect(extractQuestionsPayload({ quiz: [{ question: 'Q', options: ['a', 'b'], answer: 'A' }] })).toHaveLength(
      1,
    );
    expect(extractQuestionsPayload({})).toEqual([]);
  });

  it('drops empty invalid items rather than fabricating questions', () => {
    expect(normalizeQuestions([{ question: '', options: ['a', 'b'], answer: 'A' }])).toEqual([]);
    expect(normalizeQuestions([{ question: 'Only one opt', options: ['a'], answer: 'A' }])).toEqual([]);
  });
});
