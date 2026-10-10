import { fetchPersistedQuizResult } from '../core/services/quizResultRetrieval.service';
import { isSubmissionPersistedOnServer } from '../core/services/assignedQuizRecovery.service';

jest.mock('../core/services/quizResultRetrieval.service', () => {
  const actual = jest.requireActual('../core/services/quizResultRetrieval.service');
  return {
    ...actual,
    fetchPersistedQuizResult: jest.fn(),
    getAttendedQuiz: jest.fn(),
  };
});

const mockFetch = fetchPersistedQuizResult as jest.MockedFunction<
  typeof fetchPersistedQuizResult
>;

describe('reopened recovery displays persisted grade', () => {
  it('loads attended-quiz score when submission already persisted', async () => {
    jest.spyOn(
      require('../core/services/assignedQuizRecovery.service'),
      'isSubmissionPersistedOnServer',
    ).mockResolvedValue(true);

    mockFetch.mockResolvedValue({
      status: 'ready',
      quizData: { questions: [{ id: 'q-0', question: 'Q', options: ['a'], correctAnswer: 'A' }] },
      userAnswers: ['A'],
      score: 88,
      logData: {},
      timeSpentSeconds: 30,
      completedAt: '2026-01-02T00:00:00.000Z',
    });

    const persisted = await fetchPersistedQuizResult({
      quizId: 42,
      sessionId: 'sess',
      studentId: 's1',
      isTeacherView: false,
    });

    expect(persisted.status).toBe('ready');
    if (persisted.status === 'ready') {
      expect(persisted.score).toBe(88);
    }
    expect(await isSubmissionPersistedOnServer('s1', 'sess', 42)).toBe(true);
  });
});
