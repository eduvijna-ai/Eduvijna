import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../core/store/user.store', () => jest.requireActual('../core/store/user.store'));
jest.mock('../core/store/teacherDashboard.store', () => ({
  useTeacherDashboardStore: { getState: () => ({ reset: jest.fn() }) },
}));
jest.mock('../core/store/dashboard.store', () => ({
  useDashboardStore: { getState: () => ({ clearData: jest.fn() }) },
}));
jest.mock('../core/store/studentAssignmentDashboard.store', () => ({
  resetStudentAssignmentDashboardStore: jest.fn(),
}));

import type { UserProfile } from '../core/types';
import { useAuth, __testResetUseAuthGlobals } from '../core/hooks/useAuth';
import * as AuthAPI from '../core/api/auth.api';
import * as TokenStorage from '../core/services/tokenStorage';
import { useUserStore } from '../core/store/user.store';
import {
  bumpAuthSessionEpoch,
  clearCredentialsAtEpoch,
  restoreAuthSessionEpoch,
} from '../core/api/apiRefreshCoordinator';

jest.mock('@core/api/config', () => ({
  get: jest.fn().mockRejectedValue(new Error('skip enrich')),
  API_BASE_URL: 'http://test',
}));

jest.mock('../core/api/auth.api');
jest.mock('../core/services/tokenStorage', () => ({
  getAccessToken: jest.fn(),
  isTokenExpired: jest.fn(),
  getUserData: jest.fn(),
}));

jest.mock('../core/api/apiRefreshCoordinator', () => {
  const actual = jest.requireActual('../core/api/apiRefreshCoordinator');
  let epoch = 0;
  return {
    ...actual,
    initializeAuthSessionIdentity: jest.fn(async () => {
      epoch = 1;
      actual.restoreAuthSessionEpoch(epoch);
      return epoch;
    }),
    bumpAuthSessionEpoch: jest.fn(async () => {
      epoch += 1;
      actual.restoreAuthSessionEpoch(epoch);
      return epoch;
    }),
    getAuthSessionEpoch: jest.fn(() => epoch),
    getOutgoingCredentialEpoch: jest.fn(() => epoch),
    persistCredentialEpoch: jest.fn().mockResolvedValue(undefined),
    storeUserDataForSession: jest.fn().mockResolvedValue(true),
    storeTokensForSession: jest.fn().mockResolvedValue(true),
    clearCredentialsAtEpoch: jest.fn().mockResolvedValue(undefined),
  };
});

const mockRefresh = AuthAPI.refreshToken as jest.MockedFunction<typeof AuthAPI.refreshToken>;
const mockGetCurrentUser = AuthAPI.getCurrentUser as jest.MockedFunction<typeof AuthAPI.getCurrentUser>;
const mockLogin = AuthAPI.login as jest.MockedFunction<typeof AuthAPI.login>;
const mockFetchProfile = AuthAPI.fetchAuthProfile as jest.MockedFunction<typeof AuthAPI.fetchAuthProfile>;
const getAccessToken = TokenStorage.getAccessToken as jest.MockedFunction<typeof TokenStorage.getAccessToken>;
const isTokenExpired = TokenStorage.isTokenExpired as jest.MockedFunction<typeof TokenStorage.isTokenExpired>;
const getUserData = TokenStorage.getUserData as jest.MockedFunction<typeof TokenStorage.getUserData>;

const sampleUser: UserProfile = {
  id: '1',
  email: 'a@test.com',
  username: 'a',
  role: 'instructor',
  full_name: 'A',
  is_active: true,
  is_verified: true,
  created_at: '2026-01-01T00:00:00Z',
};

describe('useAuth lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __testResetUseAuthGlobals();
    restoreAuthSessionEpoch(0);
    useUserStore.getState().logout();
    getAccessToken.mockResolvedValue('token');
    isTokenExpired.mockResolvedValue(false);
    getUserData.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue(sampleUser);
    mockRefresh.mockResolvedValue({
      accessToken: 't',
      refreshToken: 'r',
      expiresIn: 3600,
    });
  });

  it('cold start: refresh timeout preserves credentials and uses cached profile', async () => {
    isTokenExpired.mockResolvedValue(true);
    getUserData.mockResolvedValue(JSON.stringify(sampleUser));
    mockRefresh.mockRejectedValue(new Error('Refresh timeout'));

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    expect(clearCredentialsAtEpoch).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('a@test.com');
    expect(result.current.error).toMatch(/timed out|saved/i);
  });

  it('profile timeout does not clear stored credentials', async () => {
    getUserData.mockResolvedValue(JSON.stringify(sampleUser));
    mockGetCurrentUser.mockRejectedValue(new Error('User fetch timeout'));

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    expect(clearCredentialsAtEpoch).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('account B login survives account A slow profile fetch', async () => {
    let resolveA!: (value: UserProfile) => void;
    mockLogin.mockImplementation(async (_credentials, epoch) => {
      if (epoch >= 3) {
        return {
          user: { ...sampleUser, email: 'b@test.com' },
          tokens: { accessToken: 'b', refreshToken: 'br', expiresIn: 3600 },
        };
      }
      return {
        user: sampleUser,
        tokens: { accessToken: 'a', refreshToken: 'ar', expiresIn: 3600 },
      };
    });
    mockFetchProfile.mockImplementation((epoch?: number) => {
      if (epoch === 2) {
        return new Promise((resolve) => {
          resolveA = resolve;
        });
      }
      return Promise.resolve({ ...sampleUser, email: 'b@test.com' });
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    await act(async () => {
      void result.current.login({ email: 'a@test.com', password: 'pass' });
    });
    await act(async () => {
      await result.current.login({ email: 'b@test.com', password: 'pass' });
    });

    resolveA(sampleUser);
    await waitFor(() => expect(result.current.user?.email).toBe('b@test.com'));
    expect(result.current.isAuthenticated).toBe(true);
  });

  it(
    'late refresh after startup timeout does not flip UI after superseding bump',
    async () => {
    isTokenExpired.mockResolvedValue(true);
    let resolveRefresh!: () => void;
    mockRefresh.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = () =>
            resolve({ accessToken: 'late', refreshToken: 'lr', expiresIn: 3600 });
        }),
    );
    getUserData.mockResolvedValue(JSON.stringify(sampleUser));

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isInitializing).toBe(false), { timeout: 20000 });

    expect(result.current.isAuthenticated).toBe(true);
    await act(async () => {
      await bumpAuthSessionEpoch();
    });
    resolveRefresh();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current.user?.email).toBe('a@test.com');
    expect(clearCredentialsAtEpoch).not.toHaveBeenCalled();
    },
    25000,
  );

  it('profile 403 does not clear stored credentials', async () => {
    mockGetCurrentUser.mockRejectedValue({
      response: { status: 403, data: { detail: 'Forbidden' }, headers: {}, statusText: '', config: { url: '/api/v1/auth/profile' } as any },
      isAxiosError: true,
      toJSON: () => ({}),
      name: 'AxiosError',
      message: '403',
      config: { url: '/api/v1/auth/profile' },
    });
    getUserData.mockResolvedValue(JSON.stringify(sampleUser));

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    expect(clearCredentialsAtEpoch).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('a@test.com');
  });

  it('explicit credential rejection on refresh clears session once', async () => {
    isTokenExpired.mockResolvedValue(true);
    mockRefresh.mockRejectedValue({
      response: { status: 401, data: {}, headers: {}, statusText: '', config: {} as any },
      isAxiosError: true,
      toJSON: () => ({}),
      name: 'AxiosError',
      message: '401',
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    expect(clearCredentialsAtEpoch).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
