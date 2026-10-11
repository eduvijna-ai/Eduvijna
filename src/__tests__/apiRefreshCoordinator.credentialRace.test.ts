import {
  bumpAuthSessionEpoch,
  clearAuthForSession,
  getAuthSessionEpoch,
  stampRequestSession,
  storeTokensForSession,
} from '../core/api/apiRefreshCoordinator';
import * as TokenStorage from '../core/services/tokenStorage';
import { useUserStore } from '../core/store/user.store';

jest.mock('../core/services/tokenStorage', () => ({
  storeAuthTokens: jest.fn(),
  clearAuthData: jest.fn(),
  clearAuthDataForEpoch: jest.fn(),
  storeUserData: jest.fn(),
  persistCredentialEpoch: jest.fn(),
}));

const mockSetTokens = jest.fn();
jest.mock('../core/store/user.store', () => ({
  useUserStore: {
    getState: () => ({ setTokens: mockSetTokens }),
  },
}));

describe('apiRefreshCoordinator credential race safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bumpAuthSessionEpoch();
  });

  it('stampRequestSession preserves originating session on retries', () => {
    const epoch = getAuthSessionEpoch();
    const config = { headers: {} } as any;
    stampRequestSession(config);
    bumpAuthSessionEpoch();
    stampRequestSession(config);
    expect(config._authSessionEpoch).toBe(epoch);
  });

  it('deferred refresh write cannot overwrite credentials after a new login', async () => {
    const oldEpoch = getAuthSessionEpoch();
    let releaseStaleStore!: () => void;
    let storeCalls = 0;
    (TokenStorage.storeAuthTokens as jest.Mock).mockImplementation(() => {
      storeCalls += 1;
      if (storeCalls === 1) {
        return new Promise<void>((resolve) => {
          releaseStaleStore = resolve;
        });
      }
      return Promise.resolve();
    });

    const staleWrite = storeTokensForSession(oldEpoch, {
      accessToken: 'stale-access',
      refreshToken: 'stale-refresh',
      expiresIn: 3600,
    });
    await Promise.resolve();

    bumpAuthSessionEpoch();
    const newEpoch = getAuthSessionEpoch();
    const newWrite = storeTokensForSession(newEpoch, {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 3600,
    });

    releaseStaleStore();
    const [staleResult] = await Promise.all([staleWrite, newWrite]);
    expect(staleResult).toBe(false);
    expect(mockSetTokens).toHaveBeenCalledTimes(1);
    expect(mockSetTokens).toHaveBeenCalledWith({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 3600,
    });
    expect(TokenStorage.storeAuthTokens).toHaveBeenCalledTimes(2);
    expect((TokenStorage.storeAuthTokens as jest.Mock).mock.calls[1][0]).toBe('new-access');
  });

  it('deferred logout clear cannot wipe credentials after a new login', async () => {
    const oldEpoch = getAuthSessionEpoch();
    let releaseClear!: () => void;
    (TokenStorage.clearAuthDataForEpoch as jest.Mock).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseClear = resolve;
        }),
    );

    const staleClear = clearAuthForSession(oldEpoch);
    await Promise.resolve();

    bumpAuthSessionEpoch();
    const newEpoch = getAuthSessionEpoch();
    const newWrite = storeTokensForSession(newEpoch, {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 3600,
    });

    releaseClear();
    const [clearResult] = await Promise.all([staleClear, newWrite]);
    expect(clearResult).toBe(false);
    expect(TokenStorage.clearAuthDataForEpoch).toHaveBeenCalledWith(oldEpoch);
    expect(TokenStorage.clearAuthDataForEpoch).not.toHaveBeenCalledWith(newEpoch);
    expect(mockSetTokens).toHaveBeenCalledWith({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 3600,
    });
  });
});
