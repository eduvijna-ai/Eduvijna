/**
 * Session guard policy for App auth transitions.
 * Cold-launch initial URLs must not be replayed after explicit logout or re-login.
 */
export type AuthSessionGuardReset = {
  clearPendingSession: boolean;
  clearProcessedSessionGuards: boolean;
  resetInitialDeepLinkConsumedFlag: boolean;
};

export function authLogoutSessionGuardReset(): AuthSessionGuardReset {
  return {
    clearPendingSession: true,
    clearProcessedSessionGuards: true,
    resetInitialDeepLinkConsumedFlag: false,
  };
}

export function authLoginSessionGuardReset(): AuthSessionGuardReset {
  return {
    clearPendingSession: false,
    clearProcessedSessionGuards: false,
    resetInitialDeepLinkConsumedFlag: false,
  };
}
