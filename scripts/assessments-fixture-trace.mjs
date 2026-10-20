/**
 * Trace founder fixture quiz through API → filter pipeline (sanitized output).
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { FIXTURE, loadFixtureLabels } from './lib/founder-fixture.mjs';
import { traceFixtureAssignment } from './lib/assessments-filter-pipeline.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence', 'assessments-trace');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');

mkdirSync(evidence, { recursive: true });

async function fetchTeacherSummaryQuizzes(token) {
  const url = `${getDevApiBase()}/api/v1/dashboard/quizzes?view_type=summary&limit=1000&offset=0`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(`dashboard_summary status=${res.status}`);
  return Array.isArray(body?.data) ? body.data : [];
}

async function main() {
  if (!existsSync(credFile)) {
    console.error(JSON.stringify({ ok: false, boundary: 'missing_credentials' }));
    process.exit(2);
  }
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const labels = await loadFixtureLabels();
  const instructor = await loginDevApi(cfg.accounts.instructor.username, cfg.accounts.instructor.password);
  const allQuizzes = await fetchTeacherSummaryQuizzes(instructor.token);
  const trace = traceFixtureAssignment(allQuizzes, FIXTURE, labels);
  const report = {
    at: new Date().toISOString(),
    quizId: FIXTURE.quizId,
    sessionRedacted: `${String(FIXTURE.sessionId).slice(0, 8)}…`,
    totalQuizzesInSummary: allQuizzes.length,
    labels: {
      availability: labels.availability,
      searchToken: labels.searchToken,
      classLabel: labels.classLabel,
    },
    trace,
  };
  writeFileSync(join(evidence, 'fixture-479-trace.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: trace.boundary === 'ok', boundary: trace.boundary, trace }));
  process.exit(trace.boundary === 'ok' ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, boundary: 'trace_script_error', message: String(e.message || e) }));
  process.exit(1);
});
