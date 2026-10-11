import {
  loadAssignedQuizDataForImmutableRecovery,
} from '../core/services/assessmentQuizStart.service';
import { getQuizBySessionId } from '../core/services/sharedApi';

jest.mock('../core/services/sharedApi', () => ({
  getQuizBySessionId: jest.fn(),
}));

const mockGetQuiz = getQuizBySessionId as jest.MockedFunction<typeof getQuizBySessionId>;

describe('loadAssignedQuizDataForImmutableRecovery', () => {
  it('replays attempt metadata when quiz endpoint is unavailable', async () => {
    mockGetQuiz.mockRejectedValue(new Error('network down'));

    const attemptData = {
      quiz_id: 99,
      questions: [{ id: 'q-0', question: '2+2?', options: ['3', '4'] }],
    };

    const result = await loadAssignedQuizDataForImmutableRecovery(
      {
        correctQuizId: 99,
        correctSessionId: 'sess-a',
        correctClassroomId: 'class-a',
        attemptData,
      },
      {
        mode: 'immutable_retry',
        quizId: 99,
        sessionId: 'sess-a',
        selectedAnswers: { 0: '4' },
        startedAtIso: '2026-01-01T00:00:00.000Z',
        scorePercent: 100,
        questionCount: 1,
      },
    );

    expect(result.session_id).toBe('sess-a');
    expect(result.classroom_id).toBe('class-a');
    expect(result.questions).toHaveLength(1);
  });
});
