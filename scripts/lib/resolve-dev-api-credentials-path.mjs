import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function resolveDevApiCredentialsPath(repoRoot) {
  const candidates = [
    process.env.DEV_API_CREDENTIALS_FILE,
    join(repoRoot, '.dev-api-credentials.local.json'),
    join(repoRoot, '..', 'Eduvijna', '.dev-api-credentials.local.json'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error('Missing .dev-api-credentials.local.json (set DEV_API_CREDENTIALS_FILE)');
}
