import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(repoRoot, '.dev-api-credentials.local.json'), 'utf8'));
const xml = readFileSync(
  join(repoRoot, '.dev-api-document-workflow-run/runtime-evidence/login-success-instructor.xml'),
  'utf8',
);
const m = xml.match(/password="true"[^>]*text="([^"]*)"/);
const dots = m ? m[1].length : 0;
const texts = [...xml.matchAll(/text="([^"]*)"/g)].map((x) => x[1]).filter((t) => t.trim());
const errors = texts.filter((t) => /invalid|error|failed|required|incorrect/i.test(t));
console.log(JSON.stringify({ dots, expected: cfg.accounts.instructor.password.length, errors, texts: texts.slice(0, 15) }));
