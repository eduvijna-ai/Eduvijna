import {
  executeStudentAssignedQuizViewResults,
} from '../core/services/assessmentQuizStart.service';
import { getAttendedQuiz } from '../core/services/quizResultRetrieval.service';
import { getQuizBySessionId } from '../core/services/sharedApi';

jest.mock('../core/services/quizResultRetrieval.service', () => ({
  getAttendedQuiz: jest.fn(),
}));

jest.mock('../core/services/sharedApi', () => ({
  getQuizBySessionId: jest.fn(),
}));

const mockGetAttended = getAttendedQuiz as jest.MockedFunction<typeof getAttendedQuiz>;
const mockGetQuiz = getQuizBySessionId as jest.MockedFunction<typeof getQuizBySessionId>;

describe('executeStudentAssignedQuizViewResults (Home recent completions)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to QuizResultsScreen when persisted', async () => {
    mockGetAttended.mockResolvedValue({
      submitted_at: '2026-01-02T00:00:00.000Z',
      log_data: { answers: [] },
      items: [],
    });
    const navigate = jest.fn();

    const result = await executeStudentAssignedQuizViewResults(
      {
        studentId: '7',
        quizId: 3,
        sessionId: 'sess-x',
        classroomId: 'class-x',
        quizName: 'Science',
      },
      { navigation: { navigate } },
    );

    expect(result.kind).toBe('view_results');
    expect(navigate).toHaveBeenCalledWith(
      'QuizResultsScreen',
      expect.objectContaining({
        sessionId: 'sess-x',
        isTeacherView: false,
      }),
    );
    expect(mockGetQuiz).not.toHaveBeenCalled();
  });
});
