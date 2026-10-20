/**
 * Pending open-quiz deep link state rules (mobile cold start / post-login resume).
 */

export type PendingOpenQuizDestination = {
  sessionId: string;
  quizId?: string;
};

/** Clear queued destination only on explicit logout (authenticated → signed out). */
export function shouldClearPendingOnAuthTransition(
  wasAuthenticated: boolean,
  isAuthenticated: boolean,
): boolean {
  return wasAuthenticated && !isAuthenticated;
}

export function isDuplicateOpenQuizDispatch(
  sessionId: string,
  lastProcessedSessionId: string | null,
  lastProcessedTimeMs: number,
  nowMs: number,
  debounceMs: number,
): boolean {
  return sessionId === lastProcessedSessionId && nowMs - lastProcessedTimeMs < debounceMs;
}

export function canResumePostLoginOpenQuiz(input: {
  isMobile: boolean;
  isAuthenticated: boolean;
  hasUser: boolean;
  pendingSessionId: string | null;
  navigationReady: boolean;
  navigationContainerReady: boolean;
  resumeInFlightSessionId: string | null;
}): PendingOpenQuizDestination | null {
  if (!input.isMobile || !input.isAuthenticated || !input.hasUser || !input.pendingSessionId) {
    return null;
  }
  if (!input.navigationReady || !input.navigationContainerReady) {
    return null;
  }
  if (input.resumeInFlightSessionId === input.pendingSessionId) {
    return null;
  }
  return { sessionId: input.pendingSessionId };
}
