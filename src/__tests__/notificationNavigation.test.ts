import { buildQuizGradedResultsNavigationParams } from '../core/services/notificationNavigation';

describe('buildQuizGradedResultsNavigationParams', () => {
  it('includes session and student for attended-quiz load', () => {
    expect(
      buildQuizGradedResultsNavigationParams({
        quiz_id: 42,
        session_id: 'sess-abc',
        student_id: 54,
        quiz_title: 'Math Quiz',
      }),
    ).toEqual({
      quizId: 42,
      sessionId: 'sess-abc',
      studentId: '54',
      quizName: 'Math Quiz',
      isTeacherView: false,
    });
  });

  it('returns null without quiz id', () => {
    expect(buildQuizGradedResultsNavigationParams({ session_id: 'x' })).toBeNull();
  });
});
