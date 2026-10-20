import type { ApiEnvironment } from '../../../config/apiEnvironment';
import * as apiEnvironment from '../../../config/apiEnvironment.cjs';

export const API_ENV_VAR = apiEnvironment.API_ENV_VAR;
export const REQUIRE_PRODUCTION_VAR = apiEnvironment.REQUIRE_PRODUCTION_VAR;
export const API_ORIGINS = apiEnvironment.API_ORIGINS;
export type { ApiEnvironment };
export const ApiEnvironmentConfigError = apiEnvironment.ApiEnvironmentConfigError;
export const parseApiEnvironment = apiEnvironment.parseApiEnvironment;
export const parseNonEmptyInheritedApiEnvironment = apiEnvironment.parseNonEmptyInheritedApiEnvironment;
export const assertProductionReleaseInheritedApiEnvironment =
  apiEnvironment.assertProductionReleaseInheritedApiEnvironment;
export const normalizeApiOrigin = apiEnvironment.normalizeApiOrigin;
export const resolveApiEnvironmentFromProcess = apiEnvironment.resolveApiEnvironmentFromProcess;
export const resolveApiOriginForProcess = apiEnvironment.resolveApiOriginForProcess;
