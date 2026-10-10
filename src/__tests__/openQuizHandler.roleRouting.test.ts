import { handleOpenQuiz } from '../core/services/openQuizHandler';
import { fetchQuizDetailsBySessionId } from '../core/services/dashboardApi';
import { findPendingSubmissionCheckpoint } from '../core/services/assignedQuizRecovery.service';
import { executeStudentAssignedQuizViewResults } from '../core/services/assessmentQuizStart.service';

jest.mock('../core/services/dashboardApi', () => ({
  fetchQuizDetailsBySessionId: jest.fn(),
}));

jest.mock('../core/services/assignedQuizRecovery.service', () => ({
  findPendingSubmissionCheckpoint: jest.fn(),
  buildRecoveryResumeParams: jest.fn(() => ({ mode: 'resume' })),
}));

jest.mock('../core/services/assessmentQuizStart.service', () => ({
  executeStudentAssignedQuizViewResults: jest.fn(),
  loadAssignedQuizDataForSession: jest.fn(async ({ attemptData }: { attemptData: unknown }) => attemptData),
}));

const mockFetch = fetchQuizDetailsBySessionId as jest.MockedFunction<typeof fetchQuizDetailsBySessionId>;
const mockCheckpoint = findPendingSubmissionCheckpoint as jest.MockedFunction<
  typeof findPendingSubmissionCheckpoint
>;
const mockViewResults = executeStudentAssignedQuizViewResults as jest.MockedFunction<
  typeof executeStudentAssignedQuizViewResults
>;

const baseQuiz = {
  quiz_id: 99,
  session_id: 'sess-public',
  title: 'Public Quiz',
  is_public: true,
  has_time_limit: false,
  questions: [{ id: '1', question: 'Q?', options: ['1', '2'], answer: '1' }],
};

function navigationAdapter() {
  return { navigate: jest.fn(), alert: jest.fn() };
}

async function openQuizAs(role: string, sessionId: string, quizOverrides: Record<string, unknown> = {}) {
  const nav = navigationAdapter();
  mockFetch.mockResolvedValue({
    exists: true,
    isExpired: false,
    isScheduled: false,
    isAssigned: true,
    isAttempted: false,
    quizData: { ...baseQuiz, ...quizOverrides },
    startTime: null,
    endTime: null,
  });
  await handleOpenQuiz(sessionId, 'notification', { id: 'user-1', role }, nav);
  await new Promise((resolve) => setTimeout(resolve, 150));
  return nav;
}

describe('handleOpenQuiz role routing precedence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckpoint.mockResolvedValue(null);
    mockViewResults.mockResolvedValue(undefined);
  });

  it('routes instructor public quiz notifications to teacher preview', async () => {
    const nav = await openQuizAs('instructor', 'sess-public');
    expect(nav.navigate).toHaveBeenCalledWith(
      'QuizPreviewScreen',
      expect.objectContaining({ sessionId: 'sess-public' }),
    );
    expect(nav.navigate).not.toHaveBeenCalledWith('QuizTakingScreen', expect.anything());
  });

  it('routes admin public quiz notifications to teacher preview', async () => {
    const nav = await openQuizAs('admin', 'sess-public');
    expect(nav.navigate).toHaveBeenCalledWith('QuizPreviewScreen', expect.anything());
  });

  it('routes student public quiz to QuizTakingScreen', async () => {
    const nav = await openQuizAs('student', 'sess-public');
    expect(nav.navigate).toHaveBeenCalledWith(
      'QuizTakingScreen',
      expect.objectContaining({ is_public: true }),
    );
  });

  it('routes student private assigned quiz to QuizTakingScreen', async () => {
    const nav = await openQuizAs('student', 'sess-private', { is_public: false });
    expect(nav.navigate).toHaveBeenCalledWith('QuizTakingScreen', expect.anything());
  });

  it('routes attempted student quiz through view-results resolver', async () => {
    const nav = navigationAdapter();
    mockFetch.mockResolvedValue({
      exists: true,
      isExpired: false,
      isScheduled: false,
      isAssigned: true,
      isAttempted: true,
      attemptData: { classroom_id: 'class-1' },
      quizData: { ...baseQuiz, is_public: false },
      startTime: null,
      endTime: null,
    });
    await handleOpenQuiz('sess-private', 'notification', { id: 'user-1', role: 'student' }, nav);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(mockViewResults).toHaveBeenCalled();
    expect(nav.navigate).not.toHaveBeenCalledWith('QuizPreviewScreen', expect.anything());
  });
});
