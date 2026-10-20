import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFixtureLabels, FIXTURE } from './lib/founder-fixture.mjs';
import { loginDevApi, getDevApiBase } from './lib/dev-api-auth.mjs';
import { readFileSync, existsSync } from 'node:fs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence', 'fixture-quiz-label-redacted.json');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
const instructor = await loginDevApi(cfg.accounts.instructor.username, cfg.accounts.instructor.password);
const res = await fetch(
  `${getDevApiBase()}/api/v1/dashboard/quizzes?view_type=all&quiz_id=${FIXTURE.quizId}&limit=50`,
  { headers: { Authorization: `Bearer ${instructor.token}` } },
);
const data = await res.json();
const row = (data?.data ?? []).find((r) => String(r.session_id) === FIXTURE.sessionId);
const labels = await loadFixtureLabels();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  JSON.stringify(
    {
      quizId: FIXTURE.quizId,
      sessionId: FIXTURE.sessionId,
      status: row?.status ?? null,
      listTitlePrefix: (labels.quizTitle || '').slice(0, 12),
      fields: {
        quiz_name: row?.quiz_name ? `${String(row.quiz_name).slice(0, 10)}…` : null,
        title: row?.title ? `${String(row.title).slice(0, 10)}…` : null,
        quiz_title: row?.quiz_title ? `${String(row.quiz_title).slice(0, 10)}…` : null,
      },
    },
    null,
    2,
  ),
);
console.log('wrote', out);
