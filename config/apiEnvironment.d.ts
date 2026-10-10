export const API_ENV_VAR: 'EDUVIJNA_API_ENV';
export const REQUIRE_PRODUCTION_VAR: 'EDUVIJNA_REQUIRE_PRODUCTION';

export type ApiEnvironment = 'development' | 'production';

export const API_ORIGINS: {
  readonly development: 'https://dev-api.eduvijna.com';
  readonly production: 'https://eduapi.eduvijna.com';
};

export class ApiEnvironmentConfigError extends Error {
  name: 'ApiEnvironmentConfigError';
}

export function parseApiEnvironment(raw: string): 'development' | 'production';
export function parseNonEmptyInheritedApiEnvironment(
  raw: string | undefined,
): 'development' | 'production' | undefined;
export function assertProductionReleaseInheritedApiEnvironment(raw: string | undefined): void;
export function normalizeApiOrigin(raw: string): string;
export function resolveApiEnvironmentFromProcess(
  processEnv?: NodeJS.ProcessEnv,
): 'development' | 'production';
export function resolveApiOriginForProcess(processEnv?: NodeJS.ProcessEnv): {
  environment: 'development' | 'production';
  apiOrigin: string;
};
