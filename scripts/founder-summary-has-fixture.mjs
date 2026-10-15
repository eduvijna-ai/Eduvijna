import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIXTURE } from './lib/founder-fixture.mjs';
import { loginDevApi, getDevApiBase } from './lib/dev-api-auth.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const cred = JSON.parse(readFileSync(join(repoRoot, '.dev-api-credentials.local.json'), 'utf8'));
const instructor = await loginDevApi(cred.accounts.instructor.username, cred.accounts.instructor.password);
const base = getDevApiBase();
const summary = await fetch(
  `${base}/api/v1/dashboard/quizzes?view_type=summary&limit=1000&offset=0`,
  { headers: { Authorization: `Bearer ${instructor.token}` } },
).then((r) => r.json());
const rows = Array.isArray(summary?.data) ? summary.data : [];
const hit = rows.find(
  (r) =>
    Number(r.quiz_id) === FIXTURE.quizId && String(r.session_id) === FIXTURE.sessionId,
);
const out = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence', 'fixture-in-summary-redacted.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  JSON.stringify(
    {
      summaryCount: rows.length,
      fixtureInSummary: Boolean(hit),
      fixtureAvailability: hit?.availability_status ?? null,
      fixtureQuizNamePrefix: hit?.quiz_name ? String(hit.quiz_name).slice(0, 12) + '…' : null,
    },
    null,
    2,
  ),
);
console.log('wrote', out);
