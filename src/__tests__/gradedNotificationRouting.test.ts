import { resolveStudentGradedAssignmentSession } from '../core/services/gradedNotificationRouting.service';
import { fetchQuizCheckRecord, type CheckRecordResponse } from '../core/services/dashboardApi';

jest.mock('../core/services/dashboardApi', () => ({
  fetchQuizCheckRecord: jest.fn(),
}));

const mockFetch = fetchQuizCheckRecord as jest.MockedFunction<typeof fetchQuizCheckRecord>;

describe('resolveStudentGradedAssignmentSession', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('resolves a single matching assignment session', async () => {
    mockFetch.mockImplementation(async (_studentId, type): Promise<CheckRecordResponse> => ({
      success: true,
      check_type: type ?? 'pending',
      message: '',
      result:
        type === 'completed'
          ? [
              {
                status: 'completed',
                classid: 'class-9',
                student_id: 'student-1',
                quiz_details: {
                  quiz_id: 9,
                  session_id: 'sess-9',
                  classroom_id: 'class-9',
                  topic: '',
                  summary: '',
                  start_time: '',
                  end_time: '',
                  duration: 0,
                  has_time_limit: false,
                  question_count: 0,
                  questions: { quizzes: [] },
                  status: 'completed',
                  is_active: false,
                  is_public: false,
                },
              },
            ]
          : [],
    }));
    const result = await resolveStudentGradedAssignmentSession('student-1', 9);
    expect(result).toEqual({ kind: 'resolved', sessionId: 'sess-9', classroomId: 'class-9' });
  });

  it('returns ambiguous when multiple sessions share the quiz', async () => {
    mockFetch.mockResolvedValue({
      success: true,
      check_type: 'completed',
      message: '',
      result: [
        {
          status: 'completed',
          classid: 'c1',
          student_id: 'student-1',
          quiz_details: {
            quiz_id: 9,
            session_id: 'a',
            topic: '',
            summary: '',
            start_time: '',
            end_time: '',
            duration: 0,
            has_time_limit: false,
            question_count: 0,
            questions: { quizzes: [] },
            status: 'completed',
            is_active: false,
            is_public: false,
          },
        },
        {
          status: 'completed',
          classid: 'c2',
          student_id: 'student-1',
          quiz_details: {
            quiz_id: 9,
            session_id: 'b',
            topic: '',
            summary: '',
            start_time: '',
            end_time: '',
            duration: 0,
            has_time_limit: false,
            question_count: 0,
            questions: { quizzes: [] },
            status: 'completed',
            is_active: false,
            is_public: false,
          },
        },
      ],
    });
    const result = await resolveStudentGradedAssignmentSession('student-1', 9);
    expect(result).toEqual({ kind: 'ambiguous' });
  });
});
