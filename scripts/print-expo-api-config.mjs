/**
 * Prints resolved expo.extra.API_BASE_URL for development and production (config-time check).
 */
import { spawnSync } from 'node:child_process';

function readApiBaseUrl(apiEnv) {
  const result = spawnSync('npx expo config --type public --json', {
    env: { ...process.env, EDUVIJNA_API_ENV: apiEnv },
    encoding: 'utf8',
    shell: true,
  });

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }

  const config = JSON.parse(result.stdout);
  return config?.extra?.API_BASE_URL;
}

for (const env of ['development', 'production']) {
  const origin = readApiBaseUrl(env);
  console.log(`${env}: ${origin}`);
}

try {
  spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['expo', 'config', '--type', 'public'],
    {
      env: { ...process.env, EDUVIJNA_API_ENV: 'invalid-env' },
      encoding: 'utf8',
      shell: false,
    },
  );
} catch {
  // expected
}
