import {
  authLoginSessionGuardReset,
  authLogoutSessionGuardReset,
} from '../core/services/appDeepLinkSessionPolicy';

describe('app deep link session policy', () => {
  it('never resets initial deep link consumption on logout or login', () => {
    expect(authLogoutSessionGuardReset().resetInitialDeepLinkConsumedFlag).toBe(false);
    expect(authLoginSessionGuardReset().resetInitialDeepLinkConsumedFlag).toBe(false);
  });

  it('clears pending session on logout but not on login', () => {
    expect(authLogoutSessionGuardReset().clearPendingSession).toBe(true);
    expect(authLoginSessionGuardReset().clearPendingSession).toBe(false);
  });
});
