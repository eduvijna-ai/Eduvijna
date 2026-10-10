/**
 * Auth storage isolation per API environment and legacy handling.
 */

jest.unmock('../core/services/tokenStorage');

const memoryStore: Record<string, string> = {};
const secureStore: Record<string, string> = {};

function clearStores() {
  for (const key of Object.keys(memoryStore)) delete memoryStore[key];
  for (const key of Object.keys(secureStore)) delete secureStore[key];
}

function loadTokenStorageModule(environment: 'development' | 'production') {
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

  jest.doMock('expo-secure-store', () => ({
    getItemAsync: jest.fn(async (key: string) => secureStore[key] ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      secureStore[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete secureStore[key];
    }),
  }));

  jest.doMock('react-native', () => {
    const RN = jest.requireActual('react-native');
    return Object.setPrototypeOf(
      {
        Platform: { ...RN.Platform, OS: 'android' },
      },
      RN,
    );
  });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../core/services/tokenStorage') as typeof import('../core/services/tokenStorage');
}

describe('tokenStorage API environment isolation', () => {
  beforeEach(() => {
    clearStores();
  });

  it('stores and reads tokens scoped to development', async () => {
    const tokenStorage = loadTokenStorageModule('development');
    await tokenStorage.storeAuthTokens('dev-access', 'dev-refresh', 3600);
    await tokenStorage.storeUserData(JSON.stringify({ id: 'u1' }));

    expect(await tokenStorage.getAccessToken()).toBe('dev-access');
    expect(await tokenStorage.getRefreshToken()).toBe('dev-refresh');
    expect(await tokenStorage.getUserData()).toContain('u1');
  });

  it('does not attach production tokens when app runs development', async () => {
    const prod = loadTokenStorageModule('production');
    await prod.storeAccessToken('prod-access');
    await prod.storeUserData(JSON.stringify({ id: 'prod-user' }));

    const dev = loadTokenStorageModule('development');
    expect(await dev.getAccessToken()).toBeNull();
    expect(await dev.getUserData()).toBeNull();
  });

  it('does not migrate legacy unscoped credentials into development', async () => {
    memoryStore.auth_access_token = 'legacy-token';
    memoryStore.auth_user_data = '{"id":"legacy"}';

    const tokenStorage = loadTokenStorageModule('development');
    expect(await tokenStorage.hasLegacyUnscopedAuthCredentials()).toBe(true);
    expect(await tokenStorage.getAccessToken()).toBeNull();
    expect(await tokenStorage.getUserData()).toBeNull();
  });

  it('uses distinct scoped keys per environment', () => {
    const tokenStorage = loadTokenStorageModule('development');
    expect(tokenStorage.__testScopedKey('access_token', 'development')).toBe(
      'eduvijna:auth:development:access_token',
    );
    expect(tokenStorage.__testScopedKey('access_token', 'production')).toBe(
      'eduvijna:auth:production:access_token',
    );
  });

  it('stores refresh token in SecureStore with scoped key on native', async () => {
    const tokenStorage = loadTokenStorageModule('development');
    await tokenStorage.storeAuthTokens('a', 'refresh-scoped', 60);
    expect(secureStore['eduvijna:auth:development:refresh_token']).toBe('refresh-scoped');
  });
});
