import {
  ApiEnvironmentConfigError,
  normalizeApiOrigin,
  parseApiEnvironment,
  resolveApiEnvironmentFromProcess,
  resolveApiOriginForProcess,
  API_ORIGINS,
} from '../core/config/apiEnvironment';

const testEnv = (overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv =>
  ({ NODE_ENV: 'test', ...overrides }) as NodeJS.ProcessEnv;

describe('apiEnvironment', () => {
  it('defaults missing EDUVIJNA_API_ENV to development', () => {
    expect(resolveApiEnvironmentFromProcess(testEnv())).toBe('development');
    expect(resolveApiOriginForProcess(testEnv()).apiOrigin).toBe(API_ORIGINS.development);
  });

  it('selects fixed production origin', () => {
    expect(resolveApiOriginForProcess(testEnv({ EDUVIJNA_API_ENV: 'production' })).apiOrigin).toBe(
      API_ORIGINS.production,
    );
  });

  it('rejects invalid environment names', () => {
    expect(() => resolveApiEnvironmentFromProcess({ EDUVIJNA_API_ENV: 'staging' })).toThrow(
      ApiEnvironmentConfigError,
    );
  });

  it('rejects origins with /api/v1 path', () => {
    expect(() => normalizeApiOrigin('https://dev-api.eduvijna.com/api/v1')).toThrow(
      /must not include a path/,
    );
  });

  it('requires production when EDUVIJNA_REQUIRE_PRODUCTION=1', () => {
    expect(() =>
      resolveApiEnvironmentFromProcess({
        EDUVIJNA_REQUIRE_PRODUCTION: '1',
      }),
    ).toThrow(/requires EDUVIJNA_API_ENV=production/);

    expect(() =>
      resolveApiEnvironmentFromProcess({
        EDUVIJNA_REQUIRE_PRODUCTION: '1',
        EDUVIJNA_API_ENV: 'development',
      }),
    ).toThrow(/rejects EDUVIJNA_API_ENV=development/);
  });

  it('parseApiEnvironment accepts normalized values', () => {
    expect(parseApiEnvironment(' PRODUCTION ')).toBe('production');
  });
});
