/**
 * Prints JSON auth bundle for browser CDP injection (stdout). Do not log in CI artifacts.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';

const role = process.argv[2] || 'instructor';
const credFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.dev-api-credentials.local.json');
if (!existsSync(credFile)) process.exit(2);
const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
const account = cfg.accounts?.[role];
const session = await loginDevApi(account.username, account.password);
process.stdout.write(
  JSON.stringify({
    apiBase: getDevApiBase(),
    accessToken: session.token,
    role: session.role,
    userId: session.userId,
    username: session.username,
  }),
);
