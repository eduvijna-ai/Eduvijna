/**
 * API environment selection (Node + Metro).
 * Origins are scheme + host only — callers append /api/v1 or other paths.
 */

const API_ENV_VAR = 'EDUVIJNA_API_ENV';

const API_ORIGINS = {
  development: 'https://dev-api.eduvijna.com',
  production: 'https://eduapi.eduvijna.com',
};

const ALLOWED_ENVIRONMENTS = new Set(Object.keys(API_ORIGINS));

class ApiEnvironmentConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ApiEnvironmentConfigError';
  }
}

function parseApiEnvironment(raw) {
  if (raw === undefined || raw.trim() === '') {
    throw new ApiEnvironmentConfigError(
      `Missing ${API_ENV_VAR}. Set to "development" or "production" before starting Expo (see docs/development/WORKSPACE_SETUP.md).`,
    );
  }

  const normalized = raw.trim().toLowerCase();
  if (!ALLOWED_ENVIRONMENTS.has(normalized)) {
    throw new ApiEnvironmentConfigError(
      `Invalid ${API_ENV_VAR}="${raw}". Allowed values: development, production.`,
    );
  }

  return normalized;
}

function resolveApiOrigin(environment) {
  return API_ORIGINS[environment];
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
      `API origin "${raw}" is not a valid URL. Use https://host (no /api/v1 suffix).`,
    );
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ApiEnvironmentConfigError(
      `API origin "${raw}" must use http:// or https://.`,
    );
  }

  if (url.pathname && url.pathname !== '/') {
    throw new ApiEnvironmentConfigError(
      `API origin "${raw}" must not include a path (remove "${url.pathname}").`,
    );
  }

  if (url.search || url.hash) {
    throw new ApiEnvironmentConfigError(
      `API origin "${raw}" must not include query or fragment.`,
    );
  }

  return `${url.protocol}//${url.host}`;
}

function resolveConfiguredApiOrigin(options) {
  const environment = parseApiEnvironment(options.environmentRaw);
  let apiOrigin = resolveApiOrigin(environment);

  const override = options.publicOriginOverride?.trim();
  if (override) {
    if (environment !== 'development') {
      throw new ApiEnvironmentConfigError(
        'EXPO_PUBLIC_API_BASE_URL is allowed only when EDUVIJNA_API_ENV=development.',
      );
    }
    apiOrigin = normalizeApiOrigin(override);
  } else {
    apiOrigin = normalizeApiOrigin(apiOrigin);
  }

  return { environment, apiOrigin };
}

module.exports = {
  API_ENV_VAR,
  API_ORIGINS,
  ApiEnvironmentConfigError,
  parseApiEnvironment,
  resolveApiOrigin,
  normalizeApiOrigin,
  resolveConfiguredApiOrigin,
};
