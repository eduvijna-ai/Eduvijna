/**
 * Single engineering runtime target for PR #26 acceptance (do not alternate ports casually).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ENGINEERING_METRO_PORT = 8082;
export const ENGINEERING_EXPO_WEB_URL = `http://localhost:${ENGINEERING_METRO_PORT}`;
export const ENGINEERING_REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

export function engineeringImplementationSha() {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: ENGINEERING_REPO_ROOT,
    encoding: 'utf8',
  });
  return (r.stdout || '').trim();
}
