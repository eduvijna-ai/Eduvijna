import {
  bumpAuthSessionEpoch,
  clearCredentialsAtEpoch,
  getAuthSessionEpoch,
  stampRequestSession,
  storeTokensForSession,
} from '../core/api/apiRefreshCoordinator';
import * as TokenStorage from '../core/services/tokenStorage';
jest.mock('../core/services/tokenStorage', () => ({
  storeAuthTokensForEpoch: jest.fn(),
  clearAuthDataForEpoch: jest.fn(),
  persistCredentialEpoch: jest.fn().mockResolvedValue(undefined),
}));

const mockSetTokens = jest.fn();
jest.mock('../core/store/user.store', () => ({
  useUserStore: {
    getState: () => ({ setTokens: mockSetTokens }),
  },
}));

describe('apiRefreshCoordinator credential race safety', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await bumpAuthSessionEpoch();
  });

  it('stampRequestSession preserves originating session on retries', async () => {
    const epoch = getAuthSessionEpoch();
    const config = { headers: {} } as any;
    stampRequestSession(config);
    await bumpAuthSessionEpoch();
    stampRequestSession(config);
    expect(config._authSessionEpoch).toBe(epoch);
  });

  it('deferred refresh write cannot overwrite credentials after a new login', async () => {
    const oldEpoch = getAuthSessionEpoch();
    let releaseStaleStore!: () => void;
    let storeCalls = 0;
    (TokenStorage.storeAuthTokensForEpoch as jest.Mock).mockImplementation(() => {
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

    await bumpAuthSessionEpoch();
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
  });

  it('deferred logout clear targets outgoing epoch without clearing new epoch', async () => {
    const oldEpoch = getAuthSessionEpoch();
    let releaseClear!: () => void;
    (TokenStorage.clearAuthDataForEpoch as jest.Mock).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseClear = resolve;
        }),
    );

    const staleClear = clearCredentialsAtEpoch(oldEpoch);
    await Promise.resolve();

    await bumpAuthSessionEpoch();
    const newEpoch = getAuthSessionEpoch();
    const newWrite = storeTokensForSession(newEpoch, {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 3600,
    });

    releaseClear();
    await Promise.all([staleClear, newWrite]);
    expect(TokenStorage.clearAuthDataForEpoch).toHaveBeenCalledWith(oldEpoch);
    expect(TokenStorage.clearAuthDataForEpoch).not.toHaveBeenCalledWith(newEpoch);
    expect(mockSetTokens).toHaveBeenCalledWith({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 3600,
    });
  });
});
