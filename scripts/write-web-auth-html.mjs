import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loginDevApi } from './lib/dev-api-auth.mjs';

const role = process.argv[2] || 'instructor';
const credFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.dev-api-credentials.local.json');
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', '.dev-api-document-workflow-run', 'runtime-evidence');
const outHtml = join(outDir, `web-auth-${role}.html`);
if (!existsSync(credFile)) process.exit(2);
const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
const account = cfg.accounts?.[role];
const session = await loginDevApi(account.username, account.password);
const user = {
  id: session.userId,
  username: session.username,
  role: session.role,
};
mkdirSync(outDir, { recursive: true });
const html = `<!doctype html><html><body><script>
localStorage.setItem('eduvijna.auth.development.access_token', ${JSON.stringify(session.token)});
localStorage.setItem('eduvijna.auth.development.user_data', ${JSON.stringify(JSON.stringify(user))});
location.replace('http://localhost:8083/');
</script></body></html>`;
writeFileSync(outHtml, html, 'utf8');
console.log(outHtml);
