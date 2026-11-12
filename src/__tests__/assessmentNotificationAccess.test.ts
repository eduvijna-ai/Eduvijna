import {
  authorizeInstructorCompletionNotification,
  authorizeStudentAssignedNotification,
} from '../core/services/assessmentNotificationAccess';
import {
  fetchQuizCheckRecordForSession,
  fetchTeacherClassrooms,
  fetchQuizDetails,
} from '../core/services/dashboardApi';

jest.mock('../core/services/dashboardApi', () => ({
  fetchQuizCheckRecordForSession: jest.fn(),
  fetchTeacherClassrooms: jest.fn(),
  fetchQuizDetails: jest.fn(),
}));

const mockSession = fetchQuizCheckRecordForSession as jest.MockedFunction<typeof fetchQuizCheckRecordForSession>;
const mockClasses = fetchTeacherClassrooms as jest.MockedFunction<typeof fetchTeacherClassrooms>;
const mockQuiz = fetchQuizDetails as jest.MockedFunction<typeof fetchQuizDetails>;

describe('assessment notification authorization gates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({
      status: null,
      student_id: 's1',
      classid: 'c1',
      quiz_details: { quiz_id: 9, session_id: 'sess-9' },
    } as any);
    mockClasses.mockResolvedValue({
      data: [
        { classroom_id: 'c1', students: [{student_id:'s1'}, {user_id:'s2'}] },
      ],
    } as any);
    mockQuiz.mockResolvedValue({
      data: [{quiz_id: 9, classroom_id:'c1', session_id: 'sess-9'}],
    } as any);
  });

  it('accepts only the server-confirmed student session and class', async () => {
    const result = await authorizeStudentAssignedNotification({
      studentId: 's1', sessionId: 'sess-9', quizId: '9', classroomId: 'c1',
    });
    expect(result).toEqual({
      kind: 'authorized', quizId: '9', sessionId: 'sess-9', classroomId: 'c1',
    });
    expect(mockSession).toHaveBeenCalledWith('s1','sess-9');
  });

  it('denies quiz/class mismatch or another student before opening assignment', async () => {
    await expect(authorizeStudentAssignedNotification({
      studentId:'s1',sessionId:'sess-9',quizId:'10',
    })).resolves.toMatchObject({kind:'denied',reason:'assignment_quiz_mismatch'});
    await expect(authorizeStudentAssignedNotification({
      studentId:'s1',sessionId:'sess-9',classroomId:'other',
    })).resolves.toMatchObject({kind:'denied',reason:'assignment_classroom_mismatch'});
    await expect(authorizeStudentAssignedNotification({
      studentId:'s2',sessionId:'sess-9',
    })).resolves.toMatchObject({kind:'denied',reason:'assignment_scope_mismatch'});
  });

  it('fails closed on session API errors', async () => {
    mockSession.mockRejectedValueOnce(new Error('server unavailable'));
    await expect(authorizeStudentAssignedNotification({
      studentId:'s1',sessionId:'sess-9',
    })).resolves.toMatchObject({kind:'denied',reason:'assignment_lookup_unavailable'});
  });

  it('authorizes completion only when instructor owns class, student and quiz', async () => {
    expect(await authorizeInstructorCompletionNotification({
      classroomId:'c1',quizId:'9',studentId:'s1',sessionId:'sess-9',
    })).toEqual({kind:'authorized',quizId:'9',sessionId:'sess-9',classroomId:'c1'});
    expect(mockClasses).toHaveBeenCalledWith({ forceRefresh: true });
    expect(mockQuiz).toHaveBeenCalledWith('c1',9);
  });

  it('denies class not present in authorized instructor inventory', async () => {
    expect(await authorizeInstructorCompletionNotification({
      classroomId:'other',quizId:'9',studentId:'s1',sessionId:'sess-9',
    })).toMatchObject({kind:'denied',reason:'completion_classroom_not_authorized'});
    expect(mockQuiz).not.toHaveBeenCalled();
  });

  it('denies student or quiz outside the instructor-scoped class', async () => {
    expect(await authorizeInstructorCompletionNotification({
      classroomId:'c1',quizId:'9',studentId:'s3',sessionId:'sess-9',
    })).toMatchObject({kind:'denied',reason:'completion_student_not_in_class'});
    mockQuiz.mockResolvedValueOnce({data: [{quiz_id: 99, classroom_id:'c1', session_id: 'sess-9'}]} as any);
    expect(await authorizeInstructorCompletionNotification({
      classroomId:'c1',quizId:'9',studentId:'s1',sessionId:'sess-9',
    })).toMatchObject({kind:'denied',reason:'completion_quiz_not_in_class'});
  });

  it('fails closed when instructor summary omits session identity', async () => {
    mockQuiz.mockResolvedValueOnce({
      data: [{quiz_id: 9, classroom_id: 'c1'}],
    } as any);
    expect(await authorizeInstructorCompletionNotification({
      classroomId:'c1',quizId:'9',studentId:'s1',sessionId:'sess-9',
    })).toMatchObject({kind:'denied',reason:'completion_session_unverified'});
  });

  it('rejects a different assignment session of the same quiz', async () => {
    mockQuiz.mockResolvedValueOnce({
      data: [{quiz_id: 9, classroom_id: 'c1', session_id: 'sess-other'}],
    } as any);
    expect(await authorizeInstructorCompletionNotification({
      classroomId:'c1',quizId:'9',studentId:'s1',sessionId:'sess-9',
    })).toMatchObject({kind:'denied',reason:'completion_session_unverified'});
  });

  it('fails closed on instructor API failure', async () => {
    mockClasses.mockRejectedValueOnce(new Error('offline'));
    expect(await authorizeInstructorCompletionNotification({
      classroomId:'c1',quizId:'9',studentId:'s1',sessionId:'sess-9',
    })).toMatchObject({kind:'denied',reason:'completion_lookup_unavailable'});
  });
});
