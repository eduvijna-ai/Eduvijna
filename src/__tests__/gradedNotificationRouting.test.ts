import { resolveStudentGradedAssignmentSession } from '../core/services/gradedNotificationRouting.service';
import { fetchQuizCheckRecord } from '../core/services/dashboardApi';

jest.mock('../core/services/dashboardApi', () => ({
  fetchQuizCheckRecord: jest.fn(),
}));

const mockFetch = fetchQuizCheckRecord as jest.MockedFunction<typeof fetchQuizCheckRecord>;

describe('resolveStudentGradedAssignmentSession', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('resolves a single matching assignment session', async () => {
    mockFetch.mockImplementation(async (_studentId, type) => ({
      result:
        type === 'completed'
          ? [
              {
                quiz_details: { quiz_id: 9, session_id: 'sess-9', classroom_id: 'class-9' },
              },
            ]
          : [],
    }));
    const result = await resolveStudentGradedAssignmentSession('student-1', 9);
    expect(result).toEqual({ kind: 'resolved', sessionId: 'sess-9', classroomId: 'class-9' });
  });

  it('returns ambiguous when multiple sessions share the quiz', async () => {
    mockFetch.mockResolvedValue({
      result: [
        { quiz_details: { quiz_id: 9, session_id: 'a' } },
        { quiz_details: { quiz_id: 9, session_id: 'b' } },
      ],
    });
    const result = await resolveStudentGradedAssignmentSession('student-1', 9);
    expect(result).toEqual({ kind: 'ambiguous' });
  });
});
