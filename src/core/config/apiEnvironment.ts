/* eslint-disable @typescript-eslint/no-require-imports */
const apiEnvironment = require('../../../config/apiEnvironment.cjs') as {
  API_ENV_VAR: string;
  REQUIRE_PRODUCTION_VAR: string;
  API_ORIGINS: {
    readonly development: 'https://dev-api.eduvijna.com';
    readonly production: 'https://eduapi.eduvijna.com';
  };
  ApiEnvironmentConfigError: new (message: string) => Error;
  parseApiEnvironment: (raw: string) => 'development' | 'production';
  normalizeApiOrigin: (raw: string) => string;
  resolveApiEnvironmentFromProcess: (
    processEnv?: NodeJS.ProcessEnv,
  ) => 'development' | 'production';
  resolveApiOriginForProcess: (processEnv?: NodeJS.ProcessEnv) => {
    environment: 'development' | 'production';
    apiOrigin: string;
  };
};

export const API_ENV_VAR = apiEnvironment.API_ENV_VAR;
export const REQUIRE_PRODUCTION_VAR = apiEnvironment.REQUIRE_PRODUCTION_VAR;
export const API_ORIGINS = apiEnvironment.API_ORIGINS;
export type ApiEnvironment = keyof typeof API_ORIGINS;
export const ApiEnvironmentConfigError = apiEnvironment.ApiEnvironmentConfigError;
export const parseApiEnvironment = apiEnvironment.parseApiEnvironment;
export const normalizeApiOrigin = apiEnvironment.normalizeApiOrigin;
export const resolveApiEnvironmentFromProcess = apiEnvironment.resolveApiEnvironmentFromProcess;
export const resolveApiOriginForProcess = apiEnvironment.resolveApiOriginForProcess;
