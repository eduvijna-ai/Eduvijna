import {
  extractQuestionsPayload,
  looksLikeImageBytes,
  normalizeQuestions,
  summarizeGenerationPayload,
  toDifficultyPayload,
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

  it('accepts snake_case correct_answer without inventing A', () => {
    const out = normalizeQuestions([
      {
        question: 'Snake case answer?',
        options: ['One', 'Two', 'Three', 'Four'],
        correct_answer: 'Two',
      },
    ]);
    expect(out[0].correctAnswer).toBe('Two');
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

  it('extracts questions from heterogeneous payloads including job envelopes', () => {
    expect(
      extractQuestionsPayload({
        questions: { quizzes: [{ question: 'Q', options: ['a', 'b'], answer: 'A' }] },
      }),
    ).toHaveLength(1);
    expect(extractQuestionsPayload({ quiz: [{ question: 'Q', options: ['a', 'b'], answer: 'A' }] })).toHaveLength(
      1,
    );
    expect(
      extractQuestionsPayload({
        result: { quiz: [{ question: 'R', options: ['a', 'b'], answer: 'A' }] },
      }),
    ).toHaveLength(1);
    expect(
      extractQuestionsPayload({
        data: { quiz: [{ question: 'D', options: ['a', 'b'], answer: 'A' }] },
      }),
    ).toHaveLength(1);
    expect(extractQuestionsPayload({})).toEqual([]);
  });

  it('maps difficulty with web HandwrittenWorkspace parity (medium → 4)', () => {
    expect(toDifficultyPayload('easy')).toBe('2');
    expect(toDifficultyPayload('medium')).toBe('4');
    expect(toDifficultyPayload('hard')).toBe('6');
  });

  it('summarizes generation payloads without exposing raw textbook text', () => {
    const summary = summarizeGenerationPayload({
      success: true,
      request_id: 'req-123',
      raw_content: 'SENSITIVE_PAGE_TEXT_SHOULD_NOT_LEAK',
      questions: [{ question: 'Q?', options: ['A', 'B'], answer: 'A' }],
      pipeline_stages: ['render', 'extract', 'generate'],
    });
    expect(summary.requestId).toBe('req-123');
    expect(summary.rawContentLength).toBe('SENSITIVE_PAGE_TEXT_SHOULD_NOT_LEAK'.length);
    expect(summary.validatedQuestionCount).toBe(1);
    expect(JSON.stringify(summary)).not.toContain('SENSITIVE_PAGE_TEXT');
  });

  it('drops empty invalid items rather than fabricating questions', () => {
    expect(normalizeQuestions([{ question: '', options: ['a', 'b'], answer: 'A' }])).toEqual([]);
    expect(normalizeQuestions([{ question: 'Only one opt', options: ['a'], answer: 'A' }])).toEqual([]);
  });

  it('rejects non-image cache/error bodies via magic-byte probe', () => {
    expect(looksLikeImageBytes(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(looksLikeImageBytes(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      true,
    );
    expect(looksLikeImageBytes(Uint8Array.from([0x7b, 0x22, 0x65, 0x72, 0x72, 0x6f, 0x72, 0x22]))).toBe(
      false,
    );
  });
});
