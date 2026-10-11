import {
  classifyStartupAuthError,
  parseCachedUserProfile,
  recoverableStartupMessage,
} from '../core/hooks/authLifecycle';

describe('authLifecycle policy', () => {
  it('classifies timeout as timeout not credential rejection', () => {
    expect(classifyStartupAuthError(new Error('Refresh timeout'))).toBe('timeout');
    expect(recoverableStartupMessage('timeout')).toMatch(/saved/i);
  });

  it('classifies network errors as transient', () => {
    expect(classifyStartupAuthError(new Error('Network Error'))).toBe('transient');
  });

  it('classifies 401 as credential rejection', () => {
    expect(
      classifyStartupAuthError({
        response: { status: 401, data: {}, headers: {}, statusText: '', config: {} as any },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'err',
      }),
    ).toBe('credential_rejected');
  });

  it('parses cached user profile', () => {
    const user = parseCachedUserProfile(JSON.stringify({ email: 'x@y.com', role: 'student' }));
    expect(user?.email).toBe('x@y.com');
  });
});
