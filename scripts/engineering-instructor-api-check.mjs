/**
 * One-shot instructor API login probe (no credential logging).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loginDevApi, getDevApiBase } from './lib/dev-api-auth.mjs';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credPath = resolveDevApiCredentialsPath(repoRoot);
const { accounts } = JSON.parse(readFileSync(credPath, 'utf8'));
const acct = accounts.instructor;
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `instructor-api-check-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
mkdirSync(evidenceDir, { recursive: true });

const username = acct.username ?? acct.email;
let result = {
  apiBase: getDevApiBase(),
  credentialSource: credPath.replace(/[^\\/]+$/, '[redacted].json'),
  usernameHint: username ? `${String(username).slice(0, 3)}…` : null,
  ok: false,
  role: null,
  userId: null,
  status: null,
  error: null,
};

try {
  const session = await loginDevApi(username, acct.password);
  const role = session.role || session.user?.role;
  result = {
    ...result,
    ok: ['instructor', 'admin', 'teacher'].includes(String(role)),
    role: role ?? null,
    userId: session.userId || session.user?.id || null,
    status: 'api_login_ok',
  };
} catch (e) {
  result = {
    ...result,
    ok: false,
    status: 'api_login_rejected',
    error: e?.message || String(e),
  };
}

writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, evidenceDir }));
process.exit(result.ok ? 0 : 1);
