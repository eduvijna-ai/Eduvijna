import { resolveStudentGradedAssignmentSession } from '../core/services/gradedNotificationRouting.service';
import { fetchQuizCheckRecord, fetchQuizCheckRecordForSession, type CheckRecordResponse } from '../core/services/dashboardApi';

jest.mock('../core/services/dashboardApi', () => ({
  fetchQuizCheckRecord: jest.fn(),
  fetchQuizCheckRecordForSession: jest.fn(),
}));

const mockFetch = fetchQuizCheckRecord as jest.MockedFunction<typeof fetchQuizCheckRecord>;
const mockScoped = fetchQuizCheckRecordForSession as jest.MockedFunction<typeof fetchQuizCheckRecordForSession>;

describe('resolveStudentGradedAssignmentSession', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockScoped.mockReset();
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

  it('uses completed scope when pending lookup fails', async () => {
    mockFetch.mockImplementation(async (_studentId, type) => {
      if (type === 'pending') {
        throw new Error('pending unavailable');
      }
      return {
        success: true,
        check_type: 'completed',
        message: '',
        result: [
          {
            status: 'completed',
            classid: 'class-9',
            student_id: 'student-1',
            quiz_details: {
              quiz_id: 12,
              session_id: 'sess-12',
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
        ],
      };
    });
    const result = await resolveStudentGradedAssignmentSession('student-1', 12);
    expect(result).toEqual({ kind: 'resolved', sessionId: 'sess-12', classroomId: 'class-9' });
  });
  it('validates an explicit session against the completed student record', async () => {
    mockScoped.mockResolvedValue({
      status: 'completed',
      student_id: 'student-1',
      classid: 'class-9',
      quiz_details: {quiz_id: 9,session_id:'sess-9'},
    } as any);
    await expect(resolveStudentGradedAssignmentSession('student-1',9,{
      sessionId:'sess-9',classroomId:'class-9',
    })).resolves.toEqual({kind:'resolved',sessionId:'sess-9',classroomId:'class-9'});
    expect(mockScoped).toHaveBeenCalledWith('student-1','sess-9');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects an uncompleted or mismatched explicit session', async () => {
    mockScoped.mockResolvedValue({
      status:null,student_id:'student-1',classid:'class-9',
      quiz_details:{quiz_id:9,session_id:'sess-9'},
    } as any);
    await expect(resolveStudentGradedAssignmentSession('student-1',9,{
      sessionId:'sess-9',
    })).resolves.toEqual({kind:'none'});
    mockScoped.mockResolvedValueOnce({
      status:'completed',student_id:'student-1',classid:'class-other',
      quiz_details:{quiz_id:9,session_id:'sess-9'},
    } as any);
    await expect(resolveStudentGradedAssignmentSession('student-1',9,{
      sessionId:'sess-9',classroomId:'class-9',
    })).resolves.toEqual({kind:'none'});
  });

  it('rejects a completed row belonging to a different student', async () => {
    mockScoped.mockResolvedValue({
      status:'completed',student_id:'other',classid:'class-9',
      quiz_details:{quiz_id:9,session_id:'sess-9'},
    } as any);
    await expect(resolveStudentGradedAssignmentSession('student-1',9,{
      sessionId:'sess-9',
    })).resolves.toEqual({kind:'none'});
  });

});
