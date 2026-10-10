#!/usr/bin/env node
/**
 * Run a command with EDUVIJNA_API_ENV (and production-release guard when mode=production-release).
 * Usage: node scripts/with-eduvijna-api-env.mjs <development|production|production-release> -- <command...>
 */
import { spawnSync } from 'node:child_process';

const mode = process.argv[2];
const sepIndex = process.argv.indexOf('--');
if (!mode || sepIndex === -1) {
  console.error(
    'Usage: node scripts/with-eduvijna-api-env.mjs <development|production|production-release> -- <command...>',
  );
  process.exit(1);
}

const command = process.argv.slice(sepIndex + 1);
if (command.length === 0) {
  console.error('Missing command after --');
  process.exit(1);
}

const env = { ...process.env };

if (mode === 'development') {
  env.EDUVIJNA_API_ENV = 'development';
  delete env.EDUVIJNA_REQUIRE_PRODUCTION;
} else if (mode === 'production') {
  env.EDUVIJNA_API_ENV = 'production';
  delete env.EDUVIJNA_REQUIRE_PRODUCTION;
} else if (mode === 'production-release') {
  if (env.EDUVIJNA_API_ENV === 'development') {
    console.error(
      'Refusing production release: EDUVIJNA_API_ENV=development conflicts with production-release mode.',
    );
    process.exit(1);
  }
  env.EDUVIJNA_REQUIRE_PRODUCTION = '1';
  env.EDUVIJNA_API_ENV = 'production';
} else {
  console.error(`Unknown mode "${mode}". Use development, production, or production-release.`);
  process.exit(1);
}

const result = spawnSync(command[0], command.slice(1), {
  stdio: 'inherit',
  shell: true,
  env,
});

process.exit(result.status ?? 1);
