/**
 * Re-exports shared API environment helpers (implemented in config/apiEnvironment.cjs for Expo config).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const apiEnvironment = require('../../../config/apiEnvironment.cjs') as {
  API_ENV_VAR: string;
  API_ORIGINS: {
    readonly development: 'https://dev-api.eduvijna.com';
    readonly production: 'https://eduapi.eduvijna.com';
  };
  ApiEnvironmentConfigError: new (message: string) => Error;
  parseApiEnvironment: (raw: string | undefined) => 'development' | 'production';
  resolveApiOrigin: (environment: 'development' | 'production') => string;
  normalizeApiOrigin: (raw: string) => string;
  resolveConfiguredApiOrigin: (options: {
    environmentRaw: string | undefined;
    publicOriginOverride?: string | undefined;
  }) => { environment: 'development' | 'production'; apiOrigin: string };
};

export const API_ENV_VAR = apiEnvironment.API_ENV_VAR;
export const API_ORIGINS = apiEnvironment.API_ORIGINS;
export type ApiEnvironment = keyof typeof API_ORIGINS;
export const ApiEnvironmentConfigError = apiEnvironment.ApiEnvironmentConfigError;
export const parseApiEnvironment = apiEnvironment.parseApiEnvironment;
export const resolveApiOrigin = apiEnvironment.resolveApiOrigin;
export const normalizeApiOrigin = apiEnvironment.normalizeApiOrigin;
export const resolveConfiguredApiOrigin = apiEnvironment.resolveConfiguredApiOrigin;
