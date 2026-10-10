import {
  ApiEnvironmentConfigError,
  normalizeApiOrigin,
  parseApiEnvironment,
  resolveApiOrigin,
  resolveConfiguredApiOrigin,
} from '../core/config/apiEnvironment';

describe('apiEnvironment', () => {
  describe('parseApiEnvironment', () => {
    it('accepts development and production', () => {
      expect(parseApiEnvironment('development')).toBe('development');
      expect(parseApiEnvironment(' PRODUCTION ')).toBe('production');
    });

    it('rejects missing and invalid values', () => {
      expect(() => parseApiEnvironment(undefined)).toThrow(ApiEnvironmentConfigError);
      expect(() => parseApiEnvironment('')).toThrow(ApiEnvironmentConfigError);
      expect(() => parseApiEnvironment('staging')).toThrow(/Invalid EDUVIJNA_API_ENV/);
    });
  });

  describe('resolveApiOrigin', () => {
    it('maps environments to documented origins', () => {
      expect(resolveApiOrigin('development')).toBe('https://dev-api.eduvijna.com');
      expect(resolveApiOrigin('production')).toBe('https://eduapi.eduvijna.com');
    });
  });

  describe('normalizeApiOrigin', () => {
    it('strips trailing slash and rejects paths', () => {
      expect(normalizeApiOrigin('https://dev-api.eduvijna.com/')).toBe(
        'https://dev-api.eduvijna.com',
      );
      expect(() => normalizeApiOrigin('https://dev-api.eduvijna.com/api/v1')).toThrow(
        /must not include a path/,
      );
    });

    it('rejects invalid URLs', () => {
      expect(() => normalizeApiOrigin('not-a-url')).toThrow(ApiEnvironmentConfigError);
    });
  });

  describe('resolveConfiguredApiOrigin', () => {
    it('uses development default origin', () => {
      const result = resolveConfiguredApiOrigin({ environmentRaw: 'development' });
      expect(result.environment).toBe('development');
      expect(result.apiOrigin).toBe('https://dev-api.eduvijna.com');
    });

    it('allows dev-only EXPO_PUBLIC_API_BASE_URL override', () => {
      const result = resolveConfiguredApiOrigin({
        environmentRaw: 'development',
        publicOriginOverride: 'http://10.0.2.2:8000',
      });
      expect(result.apiOrigin).toBe('http://10.0.2.2:8000');
    });

    it('rejects override in production', () => {
      expect(() =>
        resolveConfiguredApiOrigin({
          environmentRaw: 'production',
          publicOriginOverride: 'https://dev-api.eduvijna.com',
        }),
      ).toThrow(/allowed only when EDUVIJNA_API_ENV=development/);
    });
  });
});
