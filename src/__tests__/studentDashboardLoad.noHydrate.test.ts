import { loadStudentDashboardQuizzes } from '../core/services/studentDashboardData.service';
import { fetchStudentCheckRecordRows } from '../core/services/studentCheckRecordDashboardLoader';
import {
  fetchStudentClassroomNameLookup,
  fetchStudentQuizzes,
} from '../core/services/dashboardApi';
import { fetchPersistedQuizResult } from '../core/services/quizResultRetrieval.service';

jest.mock('../core/services/studentCheckRecordDashboardLoader', () => {
  const actual = jest.requireActual('../core/services/studentCheckRecordDashboardLoader');
  return {
    ...actual,
    fetchStudentCheckRecordRows: jest.fn(),
  };
});

jest.mock('../core/services/dashboardApi', () => ({
  ...jest.requireActual('../core/services/dashboardApi'),
  fetchStudentClassroomNameLookup: jest.fn(),
  fetchStudentQuizzes: jest.fn(),
  checkRecordToQuiz: jest.requireActual('../core/services/dashboardApi').checkRecordToQuiz,
}));

jest.mock('../core/services/quizResultRetrieval.service', () => ({
  fetchPersistedQuizResult: jest.fn(),
}));

const mockRows = fetchStudentCheckRecordRows as jest.MockedFunction<
  typeof fetchStudentCheckRecordRows
>;
const mockLookup = fetchStudentClassroomNameLookup as jest.MockedFunction<
  typeof fetchStudentClassroomNameLookup
>;
const mockDetails = fetchStudentQuizzes as jest.MockedFunction<typeof fetchStudentQuizzes>;
const mockPersisted = fetchPersistedQuizResult as jest.MockedFunction<
  typeof fetchPersistedQuizResult
>;

describe('loadStudentDashboardQuizzes request amplification', () => {
  beforeEach(() => {
    mockRows.mockReset();
    mockLookup.mockReset();
    mockDetails.mockReset();
    mockPersisted.mockReset();
  });

  it('does not call attended-quiz hydration for completed list rows', async () => {
    mockRows.mockResolvedValue([
      {
        classid: 'class_abcdef12',
        status: 'completed',
        quiz_details: {
          quiz_id: 10,
          session_id: 'sess-1',
          topic: 'Done Quiz',
          summary: '',
          start_time: '',
          end_time: '',
          duration: 0,
          has_time_limit: false,
          question_count: 5,
          questions: { quizzes: [] },
          status: 'completed',
          is_active: true,
          is_public: false,
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    ] as any);
    mockLookup.mockResolvedValue(new Map([['class_abcdef12', 'Class 10 A']]));
    mockDetails.mockResolvedValue({ data: [] } as any);

    const { quizzes, stats } = await loadStudentDashboardQuizzes('70');

    expect(mockPersisted).not.toHaveBeenCalled();
    expect(quizzes).toHaveLength(1);
    expect(stats.completed_count).toBe(1);
    expect(quizzes[0].classroom_name).toBe('Class 10 A');
  });
});
