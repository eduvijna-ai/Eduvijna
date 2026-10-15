import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { handleApiAuthResponseError } from '../core/api/apiClientAuthInterceptor';
import * as coordinator from '../core/api/apiRefreshCoordinator';
import type { ApiError } from '../core/types';

jest.mock('../core/services/tokenStorage', () => {
  const actual = jest.requireActual('../core/services/tokenStorage');
  return {
    ...actual,
    persistCredentialEpoch: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../core/api/apiRefreshCoordinator', () => {
  const actual = jest.requireActual('../core/api/apiRefreshCoordinator');
  return {
    ...actual,
    refreshAccessToken: jest.fn(),
  };
});

const refreshAccessToken = coordinator.refreshAccessToken as jest.MockedFunction<
  typeof coordinator.refreshAccessToken
>;

function makeAxiosError(
  status: number,
  config: InternalAxiosRequestConfig,
  data?: unknown,
): AxiosError<ApiError> {
  return {
    message: 'err',
    response: {
      status,
      data: data as ApiError,
      headers: {},
      statusText: '',
      config,
    },
    isAxiosError: true,
    toJSON: () => ({}),
    name: 'AxiosError',
    config,
  };
}

function deps(overrides: Partial<{
  apiClient: AxiosInstance;
  handleAuthenticationFailure: jest.Mock;
}> = {}) {
  let loggingOut = false;
  const apiClient = jest.fn().mockResolvedValue({ data: 'ok' }) as unknown as AxiosInstance;

  const handleAuthenticationFailure = jest.fn().mockResolvedValue(undefined);

  return {
    refreshClient: {} as AxiosInstance,
    apiClient: overrides.apiClient ?? apiClient,
    isLoggingOut: () => loggingOut,
    setLoggingOut: (v: boolean) => {
      loggingOut = v;
    },
    handleAuthenticationFailure: overrides.handleAuthenticationFailure ?? handleAuthenticationFailure,
    handleApiError: (e: AxiosError<ApiError>) => new Error(e.message),
    handleAuthenticationFailureMock: handleAuthenticationFailure,
    apiClientMock: overrides.apiClient ?? apiClient,
  };
}

describe('handleApiAuthResponseError integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await coordinator.bumpAuthSessionEpoch();
  });

  it('ordinary 403: no refresh or logout', async () => {
    const d = deps();
    const config = { url: '/api/v1/quiz', headers: {} } as InternalAxiosRequestConfig;
    coordinator.stampRequestSession(config);
    const err = makeAxiosError(403, config, { detail: 'Permission denied for quiz' });

    await expect(
      handleApiAuthResponseError(err, {
        refreshClient: d.refreshClient,
        apiClient: d.apiClient,
        isLoggingOut: d.isLoggingOut,
        setLoggingOut: d.setLoggingOut,
        handleAuthenticationFailure: d.handleAuthenticationFailure,
        handleApiError: d.handleApiError,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining('Permission') });

    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(d.handleAuthenticationFailureMock).not.toHaveBeenCalled();
  });

  it('401 + refresh transient (503): session retained', async () => {
    const d = deps();
    const config = { url: '/api/v1/protected', headers: {} } as InternalAxiosRequestConfig;
    coordinator.stampRequestSession(config);
    refreshAccessToken.mockResolvedValue({
      kind: 'transient',
      sessionEpoch: coordinator.getAuthSessionEpoch(),
      reason: 'server',
    });

    const err = makeAxiosError(401, config);
    await expect(
      handleApiAuthResponseError(err, {
        refreshClient: d.refreshClient,
        apiClient: d.apiClient,
        isLoggingOut: d.isLoggingOut,
        setLoggingOut: d.setLoggingOut,
        handleAuthenticationFailure: d.handleAuthenticationFailure,
        handleApiError: d.handleApiError,
      }),
    ).rejects.toMatchObject({ code: 'AUTH_REFRESH_TRANSIENT' });

    expect(d.handleAuthenticationFailureMock).not.toHaveBeenCalled();
  });

  it('explicit refresh rejection: controlled logout', async () => {
    const d = deps();
    const config = { url: '/api/v1/protected', headers: {} } as InternalAxiosRequestConfig;
    const epoch = coordinator.getAuthSessionEpoch();
    coordinator.stampRequestSession(config);
    refreshAccessToken.mockResolvedValue({ kind: 'rejected', sessionEpoch: epoch });

    const err = makeAxiosError(401, config);
    await expect(
      handleApiAuthResponseError(err, {
        refreshClient: d.refreshClient,
        apiClient: d.apiClient,
        isLoggingOut: d.isLoggingOut,
        setLoggingOut: d.setLoggingOut,
        handleAuthenticationFailure: d.handleAuthenticationFailure,
        handleApiError: d.handleApiError,
      }),
    ).rejects.toThrow('Session expired');

    expect(d.handleAuthenticationFailureMock).toHaveBeenCalledWith(epoch);
  });

  it('concurrent 401s: both replay after refresh success', async () => {
    let resolveRefresh!: (v: coordinator.RefreshOutcome) => void;
    const sharedRefresh = new Promise<coordinator.RefreshOutcome>((resolve) => {
      resolveRefresh = resolve;
    });
    refreshAccessToken.mockImplementation(() => sharedRefresh);

    const d = deps();

    const config1 = { url: '/api/v1/a', headers: {} } as InternalAxiosRequestConfig;
    const config2 = { url: '/api/v1/b', headers: {} } as InternalAxiosRequestConfig;
    coordinator.stampRequestSession(config1);
    coordinator.stampRequestSession(config2);

    const err1 = makeAxiosError(401, config1);
    const err2 = makeAxiosError(401, config2);

    const p1 = handleApiAuthResponseError(err1, {
      refreshClient: d.refreshClient,
      apiClient: d.apiClient,
      isLoggingOut: d.isLoggingOut,
      setLoggingOut: d.setLoggingOut,
      handleAuthenticationFailure: d.handleAuthenticationFailure,
      handleApiError: d.handleApiError,
    });
    const p2 = handleApiAuthResponseError(err2, {
      refreshClient: d.refreshClient,
      apiClient: d.apiClient,
      isLoggingOut: d.isLoggingOut,
      setLoggingOut: d.setLoggingOut,
      handleAuthenticationFailure: d.handleAuthenticationFailure,
      handleApiError: d.handleApiError,
    });

    expect(refreshAccessToken).toHaveBeenCalledTimes(2);

    resolveRefresh({
      kind: 'success',
      accessToken: 'new-token',
      sessionEpoch: coordinator.getAuthSessionEpoch(),
    });

    await Promise.all([p1, p2]);
    expect(d.apiClientMock).toHaveBeenCalledTimes(2);
  });

  it('account switch: stale request not replayed', async () => {
    const d = deps();
    const config = { url: '/api/v1/protected', headers: {} } as InternalAxiosRequestConfig;
    coordinator.stampRequestSession(config);
    await coordinator.bumpAuthSessionEpoch();

    const err = makeAxiosError(401, config);
    await expect(
      handleApiAuthResponseError(err, {
        refreshClient: d.refreshClient,
        apiClient: d.apiClient,
        isLoggingOut: d.isLoggingOut,
        setLoggingOut: d.setLoggingOut,
        handleAuthenticationFailure: d.handleAuthenticationFailure,
        handleApiError: d.handleApiError,
      }),
    ).rejects.toThrow('superseded');

    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('ordinary 500: preserved message without ReferenceError', async () => {
    const d = deps();
    const config = { url: '/api/v1/x', headers: {} } as InternalAxiosRequestConfig;
    coordinator.stampRequestSession(config);
    const err = makeAxiosError(500, config, { detail: 'DB timeout' });

    await expect(
      handleApiAuthResponseError(err, {
        refreshClient: d.refreshClient,
        apiClient: d.apiClient,
        isLoggingOut: d.isLoggingOut,
        setLoggingOut: d.setLoggingOut,
        handleAuthenticationFailure: d.handleAuthenticationFailure,
        handleApiError: d.handleApiError,
      }),
    ).rejects.toThrow('DB timeout');
  });
});
