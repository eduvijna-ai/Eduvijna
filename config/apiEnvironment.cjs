/**
 * Application API environment (fixed origins). Used by app.config and runtime.
 */

const API_ENV_VAR = 'EDUVIJNA_API_ENV';
const REQUIRE_PRODUCTION_VAR = 'EDUVIJNA_REQUIRE_PRODUCTION';

const API_ORIGINS = {
  development: 'https://dev-api.eduvijna.com',
  production: 'https://eduapi.eduvijna.com',
};

const ALLOWED = new Set(Object.keys(API_ORIGINS));

class ApiEnvironmentConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ApiEnvironmentConfigError';
  }
}

function parseApiEnvironment(raw) {
  const normalized = raw.trim().toLowerCase();
  if (!ALLOWED.has(normalized)) {
    throw new ApiEnvironmentConfigError(
      `Invalid ${API_ENV_VAR}="${raw}". Allowed values: development, production.`,
    );
  }
  return normalized;
}

/**
 * Parse non-empty inherited EDUVIJNA_API_ENV or throw.
 * @param {string | undefined} raw
 * @returns {'development' | 'production' | undefined}
 */
function parseNonEmptyInheritedApiEnvironment(raw) {
  if (raw === undefined || raw.trim() === '') {
    return undefined;
  }
  return parseApiEnvironment(raw);
}

/**
 * Validate inherited env before production-release overwrites (throws on invalid or development).
 * @param {string | undefined} raw
 */
function assertProductionReleaseInheritedApiEnvironment(raw) {
  const parsed = parseNonEmptyInheritedApiEnvironment(raw);
  if (parsed === 'development') {
    throw new ApiEnvironmentConfigError(
      `Production release rejects ${API_ENV_VAR}=development. Unset it or use production.`,
    );
  }
}

function normalizeApiOrigin(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new ApiEnvironmentConfigError('API origin must be a non-empty URL.');
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new ApiEnvironmentConfigError(
      `API origin "${raw}" is not a valid URL. Use https://host with no /api/v1 path.`,
    );
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ApiEnvironmentConfigError(`API origin "${raw}" must use http:// or https://.`);
  }

  if (url.pathname && url.pathname !== '/') {
    throw new ApiEnvironmentConfigError(
      `API origin "${raw}" must not include a path (found "${url.pathname}").`,
    );
  }

  if (url.search || url.hash) {
    throw new ApiEnvironmentConfigError(`API origin "${raw}" must not include query or fragment.`);
  }

  return `${url.protocol}//${url.host}`;
}

/**
 * @param {object} [processEnv]
 */
function resolveApiEnvironmentFromProcess(processEnv = process.env) {
  const raw = processEnv[API_ENV_VAR];
  const requireProduction = processEnv[REQUIRE_PRODUCTION_VAR] === '1';

  if (requireProduction) {
    if (raw !== undefined && raw.trim() !== '') {
      const parsed = parseApiEnvironment(raw);
      if (parsed === 'development') {
        throw new ApiEnvironmentConfigError(
          `Production release rejects ${API_ENV_VAR}=development. Unset it or use production.`,
        );
      }
      return parsed;
    }
    throw new ApiEnvironmentConfigError(
      `Production release requires ${API_ENV_VAR}=production (see docs/development/API_ENVIRONMENT.md).`,
    );
  }

  if (raw === undefined || raw.trim() === '') {
    return 'development';
  }

  return parseApiEnvironment(raw);
}

function resolveApiOriginForProcess(processEnv = process.env) {
  const environment = resolveApiEnvironmentFromProcess(processEnv);
  const origin = normalizeApiOrigin(API_ORIGINS[environment]);
  return { environment, apiOrigin: origin };
}

module.exports = {
  API_ENV_VAR,
  REQUIRE_PRODUCTION_VAR,
  API_ORIGINS,
  ApiEnvironmentConfigError,
  parseApiEnvironment,
  parseNonEmptyInheritedApiEnvironment,
  assertProductionReleaseInheritedApiEnvironment,
  normalizeApiOrigin,
  resolveApiEnvironmentFromProcess,
  resolveApiOriginForProcess,
};
