import { resolveStudentGradedAssignmentSession } from '../core/services/gradedNotificationRouting.service';
import { fetchQuizCheckRecord } from '../core/services/dashboardApi';

jest.mock('../core/services/dashboardApi', () => ({
  fetchQuizCheckRecord: jest.fn(),
}));

const mockFetch = fetchQuizCheckRecord as jest.MockedFunction<typeof fetchQuizCheckRecord>;

describe('resolveStudentGradedAssignmentSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves a single matching assignment session', async () => {
    mockFetch.mockImplementation(async (_studentId, type) => ({
      result:
        type === 'completed'
          ? [
              {
                quiz_details: {
                  quiz_id: 42,
                  session_id: 'sess-1',
                  classroom_id: 'room-1',
                },
              },
            ]
          : [],
    }));

    await expect(resolveStudentGradedAssignmentSession('student-1', 42)).resolves.toEqual({
      kind: 'resolved',
      sessionId: 'sess-1',
      classroomId: 'room-1',
    });
  });

  it('returns ambiguous when multiple sessions match the same quiz', async () => {
    mockFetch.mockResolvedValue({
      result: [
        { quiz_details: { quiz_id: 42, session_id: 'sess-a' } },
        { quiz_details: { quiz_id: 42, session_id: 'sess-b' } },
      ],
    });

    await expect(resolveStudentGradedAssignmentSession('student-1', 42)).resolves.toEqual({
      kind: 'ambiguous',
    });
  });
});
