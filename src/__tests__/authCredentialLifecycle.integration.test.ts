import {
  bumpAuthSessionEpoch,
  clearCredentialsAtEpoch,
  getAuthSessionEpoch,
  initializeAuthSessionIdentity,
  restoreAuthSessionEpoch,
  storeTokensForSession,
} from '../core/api/apiRefreshCoordinator';
import * as authApi from '../core/api/auth.api';
import * as TokenStorage from '../core/services/tokenStorage';

jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ data: {} }),
}));

const memory: Record<string, string> = {};

jest.mock('../core/services/tokenStorage', () => {
  const actual = jest.requireActual('../core/services/tokenStorage');
  return {
    ...actual,
    persistCredentialEpoch: jest.fn(async (epoch: number) => {
      memory['session_epoch'] = String(epoch);
      const { setCredentialEpoch } = require('../core/services/authCredentialEpoch');
      setCredentialEpoch(epoch);
    }),
    hydrateCredentialEpochFromStorage: jest.fn(async () => {
      const raw = memory['session_epoch'];
      const epoch = raw != null ? Number.parseInt(raw, 10) : 0;
      const { setCredentialEpoch } = require('../core/services/authCredentialEpoch');
      setCredentialEpoch(epoch);
      return epoch;
    }),
    storeAuthTokensForEpoch: jest.fn(
      async (epoch: number, access: string, refresh: string, expiresIn: number) => {
        memory[`e${epoch}.access`] = access;
        memory[`e${epoch}.refresh`] = refresh;
        memory[`e${epoch}.expiry`] = String(Date.now() + expiresIn * 1000);
      },
    ),
    storeUserDataForEpoch: jest.fn(async (epoch: number, json: string) => {
      memory[`e${epoch}.user`] = json;
    }),
    getAccessTokenForEpoch: jest.fn(async (epoch: number) => memory[`e${epoch}.access`] ?? null),
    getRefreshTokenForEpoch: jest.fn(async (epoch: number) => memory[`e${epoch}.refresh`] ?? null),
    getUserDataForEpoch: jest.fn(async (epoch: number) => memory[`e${epoch}.user`] ?? null),
    clearAuthDataForEpoch: jest.fn(async (epoch: number) => {
      for (const key of Object.keys(memory)) {
        if (key.startsWith(`e${epoch}.`)) delete memory[key];
      }
    }),
  };
});

jest.mock('../core/store/user.store', () => ({
  useUserStore: {
    getState: () => ({ setTokens: jest.fn() }),
  },
}));

describe('auth credential lifecycle integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const k of Object.keys(memory)) delete memory[k];
    restoreAuthSessionEpoch(0);
  });

  it('login then logout clears outgoing access, refresh, expiry, and profile', async () => {
    const loginEpoch = await bumpAuthSessionEpoch();
    await storeTokensForSession(loginEpoch, {
      accessToken: 'access-a',
      refreshToken: 'refresh-a',
      expiresIn: 3600,
    });
    await TokenStorage.storeUserDataForEpoch(loginEpoch, '{"id":1}');

    const outgoing = loginEpoch;
    await bumpAuthSessionEpoch();
    await authApi.logout({ credentialEpoch: outgoing });

    expect(await TokenStorage.getAccessTokenForEpoch(outgoing)).toBeNull();
    expect(await TokenStorage.getRefreshTokenForEpoch(outgoing)).toBeNull();
    expect(await TokenStorage.getUserDataForEpoch(outgoing)).toBeNull();
  });

  it('cold restart restores session namespace for reads', async () => {
    const epoch = await bumpAuthSessionEpoch();
    await storeTokensForSession(epoch, {
      accessToken: 'persisted',
      refreshToken: 'refresh',
      expiresIn: 3600,
    });
    restoreAuthSessionEpoch(0);
    const hydrated = await initializeAuthSessionIdentity();
    expect(hydrated).toBe(epoch);
    expect(getAuthSessionEpoch()).toBe(epoch);
  });

  it('account switch during backend logout preserves new account credentials', async () => {
    const oldEpoch = await bumpAuthSessionEpoch();
    await storeTokensForSession(oldEpoch, {
      accessToken: 'old',
      refreshToken: 'old-r',
      expiresIn: 3600,
    });
    const outgoing = oldEpoch;
    const newEpoch = await bumpAuthSessionEpoch();
    await storeTokensForSession(newEpoch, {
      accessToken: 'new',
      refreshToken: 'new-r',
      expiresIn: 3600,
    });

    await authApi.logout({ credentialEpoch: outgoing });

    expect(await TokenStorage.getAccessTokenForEpoch(outgoing)).toBeNull();
    expect(await TokenStorage.getAccessTokenForEpoch(newEpoch)).toBe('new');
  });

  it('clearCredentialsAtEpoch does not require current refresh epoch', async () => {
    const oldEpoch = await bumpAuthSessionEpoch();
    memory[`e${oldEpoch}.access`] = 'stale';
    await bumpAuthSessionEpoch();
    await clearCredentialsAtEpoch(oldEpoch);
    expect(memory[`e${oldEpoch}.access`]).toBeUndefined();
  });
});
