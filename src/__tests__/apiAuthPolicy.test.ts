import { classifyApiAuthError } from '../core/api/apiAuthPolicy';
import type { AxiosError } from 'axios';

function makeError(status?: number, data?: unknown, message = 'err'): AxiosError {
  return {
    message,
    response: status
      ? {
          status,
          data,
          headers: {},
          statusText: '',
          config: {} as any,
        }
      : undefined,
    isAxiosError: true,
    toJSON: () => ({}),
    name: 'AxiosError',
    config: {} as any,
  };
}

describe('classifyApiAuthError', () => {
  it('treats 403 as permission denied without refresh', () => {
    const c = classifyApiAuthError(makeError(403, { detail: 'Permission denied for quiz' }));
    expect(c.isPermissionDenied).toBe(true);
    expect(c.shouldAttemptRefresh).toBe(false);
  });

  it('attempts refresh on 401 expired token', () => {
    const c = classifyApiAuthError(makeError(401, { detail: 'Token expired' }));
    expect(c.shouldAttemptRefresh).toBe(true);
    expect(c.isPermissionDenied).toBe(false);
  });

  it('does not refresh on network errors', () => {
    const c = classifyApiAuthError(makeError(undefined, undefined, 'Network Error'));
    expect(c.isTransient).toBe(true);
    expect(c.shouldAttemptRefresh).toBe(false);
  });

  it('does not refresh on 500', () => {
    const c = classifyApiAuthError(makeError(500, { detail: 'Internal error' }));
    expect(c.isTransient).toBe(true);
    expect(c.shouldAttemptRefresh).toBe(false);
  });
});
