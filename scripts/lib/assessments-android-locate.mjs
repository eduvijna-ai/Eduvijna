import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIXTURE, loadFixtureLabels } from './founder-fixture.mjs';
import { traceFixtureAssignment } from './assessments-filter-pipeline.mjs';
import { getDevApiBase, loginDevApi } from './dev-api-auth.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');

export async function loadFixtureTrace() {
  if (!existsSync(credFile)) throw new Error('missing_credentials');
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const labels = await loadFixtureLabels();
  const instructor = await loginDevApi(cfg.accounts.instructor.username, cfg.accounts.instructor.password);
  const url = `${getDevApiBase()}/api/v1/dashboard/quizzes?view_type=summary&limit=1000&offset=0`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${instructor.token}` } });
  const body = await res.json();
  const allQuizzes = Array.isArray(body?.data) ? body.data : [];
  const trace = traceFixtureAssignment(allQuizzes, FIXTURE, labels);
  return { labels, trace, allQuizzes };
}
