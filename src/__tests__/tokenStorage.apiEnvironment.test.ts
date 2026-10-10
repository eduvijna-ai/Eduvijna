/**
 * Auth storage isolation per API environment, SecureStore key rules, and legacy handling.
 */

jest.unmock('../core/services/tokenStorage');

const SECURE_STORE_KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

const memoryStore: Record<string, string> = {};
const secureStore: Record<string, string> = {};

function assertSecureStoreKey(key: string): void {
  if (!SECURE_STORE_KEY_PATTERN.test(key)) {
    throw new Error(`Invalid SecureStore key "${key}"`);
  }
}

function clearStores() {
  for (const key of Object.keys(memoryStore)) delete memoryStore[key];
  for (const key of Object.keys(secureStore)) delete secureStore[key];
}

function createSecureStoreMock() {
  return {
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
  };
}

function loadTokenStorageModule(
  environment: 'development' | 'production',
  platformOs: 'android' | 'ios' = 'android',
) {
  jest.resetModules();
  jest.unmock('../core/services/tokenStorage');

  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: {
      expoConfig: {
        extra: {
          EDUVIJNA_API_ENV: environment,
          API_BASE_URL:
            environment === 'production'
              ? 'https://eduapi.eduvijna.com'
              : 'https://dev-api.eduvijna.com',
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
    clear: jest.fn(async () => clearStores()),
  }));

  jest.doMock('expo-secure-store', () => createSecureStoreMock());

  jest.doMock('react-native', () => {
    const RN = jest.requireActual('react-native');
    return Object.setPrototypeOf(
      {
        Platform: { ...RN.Platform, OS: platformOs },
      },
      RN,
    );
  });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../core/services/tokenStorage') as typeof import('../core/services/tokenStorage');
}

describe.each(['android', 'ios'] as const)('tokenStorage on %s', (platformOs) => {
  beforeEach(() => {
    clearStores();
  });

  it('stores and reads tokens scoped to development', async () => {
    const tokenStorage = loadTokenStorageModule('development', platformOs);
    await tokenStorage.storeAuthTokens('dev-access', 'dev-refresh', 3600);
    await tokenStorage.storeUserData(JSON.stringify({ id: 'u1' }));

    expect(await tokenStorage.getAccessToken()).toBe('dev-access');
    expect(await tokenStorage.getRefreshToken()).toBe('dev-refresh');
    expect(await tokenStorage.getUserData()).toContain('u1');
  });

  it('does not attach production tokens when app runs development', async () => {
    const prod = loadTokenStorageModule('production', platformOs);
    await prod.storeAccessToken('prod-access');
    await prod.storeUserData(JSON.stringify({ id: 'prod-user' }));

    const dev = loadTokenStorageModule('development', platformOs);
    expect(await dev.getAccessToken()).toBeNull();
    expect(await dev.getUserData()).toBeNull();
  });

  it('does not migrate legacy unscoped credentials into development', async () => {
    memoryStore.auth_access_token = 'legacy-token';
    memoryStore.auth_user_data = '{"id":"legacy"}';

    const tokenStorage = loadTokenStorageModule('development', platformOs);
    expect(await tokenStorage.hasLegacyUnscopedAuthCredentials()).toBe(true);
    expect(await tokenStorage.getAccessToken()).toBeNull();
    expect(await tokenStorage.getUserData()).toBeNull();
  });

  it('uses SecureStore-compatible scoped keys per environment', () => {
    const tokenStorage = loadTokenStorageModule('development', platformOs);
    const devAccess = tokenStorage.__testScopedKey('access_token', 'development');
    const prodAccess = tokenStorage.__testScopedKey('access_token', 'production');
    const devRefresh = tokenStorage.__testScopedKey('refresh_token', 'development');

    expect(devAccess).toBe('eduvijna.auth.development.access_token');
    expect(prodAccess).toBe('eduvijna.auth.production.access_token');
    expect(devRefresh).toBe('eduvijna.auth.development.refresh_token');
    expect(SECURE_STORE_KEY_PATTERN.test(devRefresh)).toBe(true);
  });

  it('writes, reads, and deletes refresh token in SecureStore with scoped key', async () => {
    const tokenStorage = loadTokenStorageModule('development', platformOs);
    const refreshKey = tokenStorage.__testScopedKey('refresh_token', 'development');

    await tokenStorage.storeRefreshToken('refresh-scoped');
    expect(secureStore[refreshKey]).toBe('refresh-scoped');
    expect(await tokenStorage.getRefreshToken()).toBe('refresh-scoped');

    await tokenStorage.clearAuthData();
    expect(secureStore[refreshKey]).toBeUndefined();
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });

  it('rejects legacy colon-separated keys on SecureStore write', async () => {
    const invalidKey = 'eduvijna:auth:development:refresh_token';
    await expect(
      createSecureStoreMock().setItemAsync(invalidKey, 'token'),
    ).rejects.toThrow(/Invalid SecureStore key/);
  });
});

describe('tokenStorage API environment isolation', () => {
  beforeEach(() => {
    clearStores();
  });

  it('stores refresh token in SecureStore with scoped key on native', async () => {
    const tokenStorage = loadTokenStorageModule('development');
    await tokenStorage.storeAuthTokens('a', 'refresh-scoped', 60);
    expect(secureStore['eduvijna.auth.development.refresh_token']).toBe('refresh-scoped');
  });
});
