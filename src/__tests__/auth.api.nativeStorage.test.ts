/**
 * Login flow must persist refresh tokens with SecureStore-compatible keys on native.
 */

const memoryStore: Record<string, string> = {};
const secureStore: Record<string, string> = {};
const SECURE_STORE_KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

function assertSecureStoreKey(key: string): void {
  if (!SECURE_STORE_KEY_PATTERN.test(key)) {
    throw new Error(`Invalid SecureStore key "${key}"`);
  }
}

function loadAuthApiOnNative(platformOs: 'android' | 'ios') {
  jest.resetModules();
  jest.unmock('../core/services/tokenStorage');

  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: {
      expoConfig: {
        extra: {
          EDUVIJNA_API_ENV: 'development',
          API_BASE_URL: 'https://dev-api.eduvijna.com',
        },
      },
    },
  }));

  jest.doMock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(async (key: string) => memoryStore[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      memoryStore[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete memoryStore[key];
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((key) => delete memoryStore[key]);
    }),
  }));

  jest.doMock('expo-secure-store', () => ({
    getItemAsync: jest.fn(async (key: string) => {
      assertSecureStoreKey(key);
      return secureStore[key] ?? null;
    }),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      assertSecureStoreKey(key);
      secureStore[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      assertSecureStoreKey(key);
      delete secureStore[key];
    }),
  }));

  jest.doMock('react-native', () => {
    const RN = jest.requireActual('react-native');
    return Object.setPrototypeOf(
      {
        Platform: { ...RN.Platform, OS: platformOs },
      },
      RN,
    );
  });

  const post = jest.fn().mockResolvedValue({
    access_token: 'access-from-api',
    refresh_token: 'refresh-from-api',
    user: { id: 1, email: 'student@test.com', role: 'student' },
  });

  jest.doMock('../core/api/config', () => ({
    post,
    get: jest.fn(),
  }));

  jest.doMock('../core/store/user.store', () => ({
    useUserStore: {
      getState: () => ({ setTokens: jest.fn() }),
    },
  }));

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { restoreAuthSessionEpoch } = require('../core/api/apiRefreshCoordinator') as typeof import('../core/api/apiRefreshCoordinator');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { setCredentialEpoch } = require('../core/services/authCredentialEpoch') as typeof import('../core/services/authCredentialEpoch');
  const sessionEpoch = 1;
  restoreAuthSessionEpoch(sessionEpoch);
  setCredentialEpoch(sessionEpoch);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const authApi = require('../core/api/auth.api') as typeof import('../core/api/auth.api');
  return { authApi, post, sessionEpoch };
}

describe.each(['android', 'ios'] as const)('auth.api login native storage (%s)', (platformOs) => {
  beforeEach(() => {
    for (const key of Object.keys(memoryStore)) delete memoryStore[key];
    for (const key of Object.keys(secureStore)) delete secureStore[key];
  });

  it('persists refresh token under environment-scoped SecureStore key', async () => {
    const { authApi, sessionEpoch } = loadAuthApiOnNative(platformOs);

    await authApi.login({ email: 'student@test.com', password: 'secret' }, sessionEpoch);

    expect(secureStore[`eduvijna.auth.development.e${sessionEpoch}.refresh_token`]).toBe(
      'refresh-from-api',
    );
    expect(memoryStore[`eduvijna.auth.development.e${sessionEpoch}.access_token`]).toBe(
      'access-from-api',
    );
  });

  it('surfaces SecureStore key failures during login', async () => {
    jest.resetModules();
    jest.unmock('../core/services/tokenStorage');

    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: {
            EDUVIJNA_API_ENV: 'development',
            API_BASE_URL: 'https://dev-api.eduvijna.com',
          },
        },
      },
    }));

    jest.doMock('@react-native-async-storage/async-storage', () => ({
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      multiRemove: jest.fn(),
    }));

    jest.doMock('expo-secure-store', () => ({
      setItemAsync: jest.fn(async () => {
        throw new Error('SecureStore unavailable');
      }),
      getItemAsync: jest.fn(),
      deleteItemAsync: jest.fn(),
    }));

    jest.doMock('react-native', () => {
      const RN = jest.requireActual('react-native');
      return Object.setPrototypeOf(
        { Platform: { ...RN.Platform, OS: platformOs } },
        RN,
      );
    });

    jest.doMock('../core/api/config', () => ({
      post: jest.fn().mockResolvedValue({
        access_token: 'a',
        refresh_token: 'r',
        user: { id: 1 },
      }),
      get: jest.fn(),
    }));

    jest.doMock('../core/store/user.store', () => ({
      useUserStore: {
        getState: () => ({ setTokens: jest.fn() }),
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { restoreAuthSessionEpoch } = require('../core/api/apiRefreshCoordinator') as typeof import('../core/api/apiRefreshCoordinator');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setCredentialEpoch } = require('../core/services/authCredentialEpoch') as typeof import('../core/services/authCredentialEpoch');
    const sessionEpoch = 1;
    restoreAuthSessionEpoch(sessionEpoch);
    setCredentialEpoch(sessionEpoch);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authApi = require('../core/api/auth.api') as typeof import('../core/api/auth.api');

    await expect(authApi.login({ email: 'x@y.com', password: 'p' }, sessionEpoch)).rejects.toThrow(
      /Failed to store refresh token/,
    );
  });
});
