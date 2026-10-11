import {
  classifyStartupAuthError,
  parseCachedUserProfile,
  recoverableStartupMessage,
} from '../core/hooks/authLifecycle';

function axiosError(status: number, url?: string) {
  return {
    response: { status, data: {}, headers: {}, statusText: '', config: { url } as any },
    isAxiosError: true,
    toJSON: () => ({}),
    name: 'AxiosError',
    message: 'err',
    config: { url },
  };
}

describe('authLifecycle policy', () => {
  it('classifies timeout as timeout not credential rejection', () => {
    expect(classifyStartupAuthError(new Error('Refresh timeout'))).toBe('timeout');
    expect(recoverableStartupMessage('timeout')).toMatch(/saved/i);
  });

  it('classifies network errors as transient', () => {
    expect(classifyStartupAuthError(new Error('Network Error'))).toBe('transient');
  });

  it('classifies 401 on login as credential rejection', () => {
    expect(
      classifyStartupAuthError(axiosError(401, '/api/v1/auth/login'), { operation: 'login' }),
    ).toBe('credential_rejected');
  });

  it('classifies profile 403 as transient (permission denied, keep session)', () => {
    expect(
      classifyStartupAuthError(axiosError(403, '/api/v1/auth/profile'), {
        operation: 'startup_profile',
      }),
    ).toBe('transient');
  });

  it('classifies non-auth 404 as transient', () => {
    expect(classifyStartupAuthError(axiosError(404, '/api/v1/school-management/my-school'))).toBe(
      'transient',
    );
  });

  it('classifies refresh 401 as credential rejection', () => {
    expect(
      classifyStartupAuthError(axiosError(401, '/api/v1/auth/refresh'), {
        operation: 'startup_refresh',
      }),
    ).toBe('credential_rejected');
  });

  it('classifies 429 as transient', () => {
    expect(classifyStartupAuthError(axiosError(429, '/api/v1/auth/profile'))).toBe('transient');
  });

  it('parses cached user profile', () => {
    const user = parseCachedUserProfile(JSON.stringify({ email: 'x@y.com', role: 'student' }));
    expect(user?.email).toBe('x@y.com');
  });
});
