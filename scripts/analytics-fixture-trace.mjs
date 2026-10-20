/**
 * Trace founder fixture quiz 479 through teacher analytics API → class aggregation.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { FIXTURE, loadFixtureLabels } from './lib/founder-fixture.mjs';
function classIdsInRows(rows) {
  const ids = new Set();
  for (const r of rows) {
    if (r.classroom_id) ids.add(String(r.classroom_id));
  }
  return [...ids];
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence', 'analytics-trace');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');

mkdirSync(evidence, { recursive: true });

function lastMonthRange() {
  const today = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(today.getMonth() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return {
    from: lastMonth.toISOString().split('T')[0],
    to: tomorrow.toISOString().split('T')[0],
  };
}

function academicYearRange() {
  const today = new Date();
  const academicYearStart =
    today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  const from = new Date(academicYearStart, 7, 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return {
    from: from.toISOString().split('T')[0],
    to: tomorrow.toISOString().split('T')[0],
  };
}

async function fetchAnalyticsAll(token, createdFrom, createdTo) {
  const q = new URLSearchParams({
    view_type: 'all',
    limit: '500',
    offset: '0',
    created_from: createdFrom,
    created_to: createdTo,
  });
  const url = `${getDevApiBase()}/api/v1/dashboard/quizzes?${q.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(`analytics_all status=${res.status}`);
  return Array.isArray(body?.data) ? body.data : [];
}

async function main() {
  if (!existsSync(credFile)) {
    console.error(JSON.stringify({ ok: false, boundary: 'missing_credentials' }));
    process.exit(2);
  }
  const labels = await loadFixtureLabels();
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const instructor = await loginDevApi(cfg.accounts.instructor.username, cfg.accounts.instructor.password);

  const narrow = lastMonthRange();
  const wide = academicYearRange();
  const [narrowRows, wideRows] = await Promise.all([
    fetchAnalyticsAll(instructor.token, narrow.from, narrow.to),
    fetchAnalyticsAll(instructor.token, wide.from, wide.to),
  ]);

  const matchRow = (rows) =>
    rows.find(
      (r) =>
        Number(r.quiz_id) === FIXTURE.quizId &&
        String(r.session_id) === FIXTURE.sessionId,
    );

  const narrowMatch = matchRow(narrowRows);
  const wideMatch = matchRow(wideRows);
  const wideClassIds = classIdsInRows(wideRows);
  const classHit = wideClassIds.includes(FIXTURE.classroomId);

  const report = {
    at: new Date().toISOString(),
    quizId: FIXTURE.quizId,
    classroomId: FIXTURE.classroomId,
    classLabel: labels.classLabel,
    dateRanges: { narrow, wide },
    narrow: {
      rowCount: narrowRows.length,
      fixtureInResponse: Boolean(narrowMatch),
    },
    wide: {
      rowCount: wideRows.length,
      fixtureInResponse: Boolean(wideMatch),
      classOverviewIncludesFixture: classHit,
    },
    boundary:
      wideMatch && classHit ? 'ok' : wideMatch ? 'class_aggregation' : 'api_date_filter',
  };

  writeFileSync(join(evidence, 'fixture-479-analytics-trace.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.boundary === 'ok', boundary: report.boundary, report }));
  process.exit(report.boundary === 'ok' ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, boundary: 'trace_script_error', message: String(e.message || e) }));
  process.exit(1);
});
