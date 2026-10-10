#!/usr/bin/env node
/**
 * Run a command with EDUVIJNA_API_ENV (and production-release guard when mode=production-release).
 * Usage: node scripts/with-eduvijna-api-env.mjs <development|production|production-release> -- <command...>
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const {
  API_ENV_VAR,
  REQUIRE_PRODUCTION_VAR,
  ApiEnvironmentConfigError,
  parseNonEmptyInheritedApiEnvironment,
  assertProductionReleaseInheritedApiEnvironment,
} = require(join(dirname(fileURLToPath(import.meta.url)), '../config/apiEnvironment.cjs'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseInheritedOrExit(raw) {
  if (raw === undefined || raw.trim() === '') {
    return undefined;
  }
  try {
    return parseNonEmptyInheritedApiEnvironment(raw);
  } catch (error) {
    const message =
      error instanceof ApiEnvironmentConfigError ? error.message : String(error);
    fail(message);
  }
}

function applyMode(mode, env) {
  const inheritedRaw = env[API_ENV_VAR];
  parseInheritedOrExit(inheritedRaw);

  if (mode === 'development') {
    env[API_ENV_VAR] = 'development';
    delete env[REQUIRE_PRODUCTION_VAR];
    return;
  }

  if (mode === 'production') {
    env[API_ENV_VAR] = 'production';
    delete env[REQUIRE_PRODUCTION_VAR];
    return;
  }

  if (mode === 'production-release') {
    try {
      assertProductionReleaseInheritedApiEnvironment(inheritedRaw);
    } catch (error) {
      const message =
        error instanceof ApiEnvironmentConfigError ? error.message : String(error);
      fail(message);
    }
    env[REQUIRE_PRODUCTION_VAR] = '1';
    env[API_ENV_VAR] = 'production';
    return;
  }

  fail(`Unknown mode "${mode}". Use development, production, or production-release.`);
}

const mode = process.argv[2];
const sepIndex = process.argv.indexOf('--');
if (!mode || sepIndex === -1) {
  fail(
    'Usage: node scripts/with-eduvijna-api-env.mjs <development|production|production-release> -- <command...>',
  );
}

const command = process.argv.slice(sepIndex + 1);
if (command.length === 0) {
  fail('Missing command after --');
}

const env = { ...process.env };
applyMode(mode, env);

const result = spawnSync(command[0], command.slice(1), {
  stdio: 'pipe',
  shell: false,
  env,
  encoding: 'utf8',
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

process.exit(result.status ?? 1);
