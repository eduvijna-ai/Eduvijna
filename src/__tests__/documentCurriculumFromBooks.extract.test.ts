import { extractQuizArrayFromGenerationResponse } from '../core/utils/documentCurriculumGeneratedHandoff';

describe('From Books generation response extraction', () => {
  it('accepts questions-only payloads used by saved-books job results', () => {
    const quiz = extractQuizArrayFromGenerationResponse({
      message: 'ok',
      questions: [
        {
          question: 'Q1',
          options: ['A', 'B', 'C', 'D'],
          answer: 'B',
        },
      ],
    });
    expect(quiz).toHaveLength(1);
  });

  it('accepts nested result.quiz from persisted generation jobs', () => {
    const quiz = extractQuizArrayFromGenerationResponse({
      status: 'persisted',
      result: {
        quiz: [
          {
            question: 'Nested',
            options: ['1', '2', '3', '4'],
            answer: '1',
          },
        ],
      },
    });
    expect(quiz).toHaveLength(1);
    expect((quiz[0] as { question: string }).question).toBe('Nested');
  });
});
