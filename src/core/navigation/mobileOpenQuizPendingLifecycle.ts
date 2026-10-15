/**
 * Pure lifecycle for mobile signed-out openquiz pending (unit-tested event order).
 */

export type PendingOpenQuizRequest = {
  sessionId: string;
  quizId?: string;
  source: string;
};

export type PendingLifecycleSnapshot = {
  pending: PendingOpenQuizRequest | null;
  resumeInFlightSessionId: string | null;
  isAuthenticated: boolean;
  wasAuthenticated: boolean;
  authenticatedNavReady: boolean;
  navigationReady: boolean;
};

export type PendingLifecycleAction =
  | { type: 'queue'; sessionId: string; quizId?: string; source: string }
  | { type: 'hydrate'; sessionId: string; quizId?: string; source: string }
  | { type: 'clear'; reason: string }
  | { type: 'auth_changed'; isAuthenticated: boolean }
  | { type: 'auth_nav_ready'; ready: boolean }
  | { type: 'navigation_ready'; ready: boolean }
  | { type: 'resume_started'; sessionId: string }
  | { type: 'resume_finished'; sessionId: string; success: boolean };

export function createPendingLifecycleSnapshot(
  partial?: Partial<PendingLifecycleSnapshot>,
): PendingLifecycleSnapshot {
  return {
    pending: partial?.pending ?? null,
    resumeInFlightSessionId: partial?.resumeInFlightSessionId ?? null,
    isAuthenticated: partial?.isAuthenticated ?? false,
    wasAuthenticated: partial?.wasAuthenticated ?? false,
    authenticatedNavReady: partial?.authenticatedNavReady ?? false,
    navigationReady: partial?.navigationReady ?? false,
  };
}

export function reducePendingLifecycle(
  state: PendingLifecycleSnapshot,
  action: PendingLifecycleAction,
): PendingLifecycleSnapshot {
  switch (action.type) {
    case 'queue':
    case 'hydrate':
      return {
        ...state,
        pending: {
          sessionId: action.sessionId,
          quizId: action.quizId,
          source: action.source,
        },
        resumeInFlightSessionId: null,
      };
    case 'clear':
      return {
        ...state,
        pending: null,
        resumeInFlightSessionId: null,
        authenticatedNavReady: false,
      };
    case 'auth_changed': {
      const was = state.isAuthenticated;
      const isAuth = action.isAuthenticated;
      const loggingOut = was && !isAuth;
      return {
        ...state,
        wasAuthenticated: was,
        isAuthenticated: isAuth,
        authenticatedNavReady: loggingOut ? false : state.authenticatedNavReady,
        pending: loggingOut ? null : state.pending,
        resumeInFlightSessionId: loggingOut ? null : state.resumeInFlightSessionId,
      };
    }
    case 'auth_nav_ready':
      return { ...state, authenticatedNavReady: action.ready };
    case 'navigation_ready':
      return { ...state, navigationReady: action.ready };
    case 'resume_started':
      return { ...state, resumeInFlightSessionId: action.sessionId };
    case 'resume_finished':
      return {
        ...state,
        resumeInFlightSessionId:
          state.resumeInFlightSessionId === action.sessionId && action.success
            ? action.sessionId
            : action.success
              ? state.resumeInFlightSessionId
              : null,
        pending: action.success ? null : state.pending,
      };
    default:
      return state;
  }
}

export function selectPostLoginResumeTarget(
  state: PendingLifecycleSnapshot,
): PendingOpenQuizRequest | null {
  if (!state.isAuthenticated || !state.pending) return null;
  if (!state.navigationReady || !state.authenticatedNavReady) return null;
  if (state.resumeInFlightSessionId === state.pending.sessionId) return null;
  return state.pending;
}
