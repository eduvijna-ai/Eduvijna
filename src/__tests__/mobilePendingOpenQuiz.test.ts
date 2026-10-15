import {
  canResumePostLoginOpenQuiz,
  isDuplicateOpenQuizDispatch,
  shouldClearPendingOnAuthTransition,
} from '../core/navigation/mobilePendingOpenQuiz';

describe('mobilePendingOpenQuiz', () => {
  it('clears pending only on explicit logout transition', () => {
    expect(shouldClearPendingOnAuthTransition(false, false)).toBe(false);
    expect(shouldClearPendingOnAuthTransition(false, true)).toBe(false);
    expect(shouldClearPendingOnAuthTransition(true, true)).toBe(false);
    expect(shouldClearPendingOnAuthTransition(true, false)).toBe(true);
  });

  it('debounces duplicate session dispatch', () => {
    const now = 10_000;
    expect(isDuplicateOpenQuizDispatch('s1', 's1', now - 500, now, 2000)).toBe(true);
    expect(isDuplicateOpenQuizDispatch('s1', 's1', now - 2500, now, 2000)).toBe(false);
    expect(isDuplicateOpenQuizDispatch('s2', 's1', now - 500, now, 2000)).toBe(false);
  });

  it('waits for auth, user, and navigation readiness before post-login resume', () => {
    const base = {
      isMobile: true,
      isAuthenticated: true,
      hasUser: true,
      pendingSessionId: 'sess-a',
      navigationReady: true,
      navigationContainerReady: true,
      resumeInFlightSessionId: null,
    };
    expect(canResumePostLoginOpenQuiz(base)).toEqual({ sessionId: 'sess-a' });
    expect(canResumePostLoginOpenQuiz({ ...base, isAuthenticated: false })).toBeNull();
    expect(canResumePostLoginOpenQuiz({ ...base, pendingSessionId: null })).toBeNull();
    expect(canResumePostLoginOpenQuiz({ ...base, navigationReady: false })).toBeNull();
    expect(canResumePostLoginOpenQuiz({ ...base, navigationContainerReady: false })).toBeNull();
    expect(
      canResumePostLoginOpenQuiz({ ...base, resumeInFlightSessionId: 'sess-a' }),
    ).toBeNull();
  });
});
