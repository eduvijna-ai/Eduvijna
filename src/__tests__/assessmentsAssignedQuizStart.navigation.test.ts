/**
 * Assessments student start path: quiz load failure must not navigate without questions.
 */

import { Alert } from 'react-native';
import { checkQuizAttempt } from '../core/services/sharedApi';
import {
  AssignedQuizLoadError,
  navigateToAssignedQuizTaking,
} from '../core/services/assessmentQuizStart.service';
import { findPendingSubmissionCheckpoint } from '../core/services/assignedQuizRecovery.service';

jest.mock('../core/services/sharedApi', () => ({
  checkQuizAttempt: jest.fn(),
}));

jest.mock('../core/services/assignedQuizRecovery.service', () => ({
  findPendingSubmissionCheckpoint: jest.fn(),
  buildRecoveryResumeParams: jest.fn(),
}));

jest.mock('../core/services/assessmentQuizStart.service', () => {
  const actual = jest.requireActual('../core/services/assessmentQuizStart.service');
  return {
    ...actual,
    navigateToAssignedQuizTaking: jest.fn(),
  };
});

const mockCheckAttempt = checkQuizAttempt as jest.MockedFunction<typeof checkQuizAttempt>;
const mockFindPending = findPendingSubmissionCheckpoint as jest.MockedFunction<
  typeof findPendingSubmissionCheckpoint
>;
const mockNavigateAssigned = navigateToAssignedQuizTaking as jest.MockedFunction<
  typeof navigateToAssignedQuizTaking
>;

/** Mirrors Assessments handleAction student start error handling. */
async function runStudentStartLikeAssessments(
  navigation: { navigate: jest.Mock },
  attemptData: Record<string, unknown>,
): Promise<'alert' | 'navigated' | 'fallback'> {
  const correctQuizId = attemptData.quiz_id as number;
  const correctSessionId = (attemptData.session_id as string) || '';
  const correctClassroomId = (attemptData.classroom_id as string) || '';
  const startCtx = {
    correctQuizId,
    correctSessionId,
    correctClassroomId,
    attemptData,
  };

  try {
    const attemptCheck = await checkQuizAttempt(correctQuizId, 'student-1', correctSessionId);
    if (attemptCheck.lookupFailed) {
      return 'alert';
    }

    const pendingCheckpoint = await findPendingSubmissionCheckpoint(
      'student-1',
      correctQuizId,
      correctSessionId,
    );
    if (pendingCheckpoint) {
      await navigateToAssignedQuizTaking(navigation, undefined, startCtx, null);
      return 'navigated';
    }

    if (attemptCheck.hasAttempted && attemptCheck.status === 'completed') {
      return 'alert';
    }

    await navigateToAssignedQuizTaking(navigation, undefined, startCtx);
    return 'navigated';
  } catch (error) {
    if (error instanceof AssignedQuizLoadError) {
      Alert.alert(
        'Connection Error',
        'Could not load quiz questions. Please check your connection and try again.',
      );
      return 'alert';
    }
    navigation.navigate('QuizTakingScreen', { quizData: attemptData });
    return 'fallback';
  }
}

describe('Assessments assigned quiz start navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('shows retry alert and does not navigate when quiz load fails', async () => {
    mockCheckAttempt.mockResolvedValue({
      hasAttempted: false,
      lookupFailed: false,
    } as Awaited<ReturnType<typeof checkQuizAttempt>>);
    mockFindPending.mockResolvedValue(null);
    mockNavigateAssigned.mockRejectedValue(
      new AssignedQuizLoadError('Could not load assigned quiz questions'),
    );

    const navigation = { navigate: jest.fn() };
    const outcome = await runStudentStartLikeAssessments(navigation, {
      quiz_id: 10,
      session_id: 'sess-10',
      classroom_id: 'c1',
    });

    expect(outcome).toBe('alert');
    expect(Alert.alert).toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
