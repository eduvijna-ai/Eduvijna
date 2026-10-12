/**
 * Compare teacher analytics API totals for identical date boundaries (web/mobile parity).
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { FIXTURE, loadFixtureLabels } from './lib/founder-fixture.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, 'docs', 'evidence', 'analytics-parity');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');

mkdirSync(evidence, { recursive: true });

function defaultRange() {
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

function fixtureRange() {
  return { from: '2026-08-01', to: '2026-10-13' };
}

async function fetchAll(token, from, to) {
  const q = new URLSearchParams({
    view_type: 'all',
    limit: '500',
    offset: '0',
    created_from: from,
    created_to: to,
  });
  const url = `${getDevApiBase()}/api/v1/dashboard/quizzes?${q.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(`status=${res.status}`);
  const rows = Array.isArray(body?.data) ? body.data : [];
  const classes = new Map();
  for (const r of rows) {
    const id = String(r.classroom_id ?? r.class_id ?? '');
    if (!id) continue;
    if (!classes.has(id)) {
      classes.set(id, { classroom_id: id, classroom_name: r.classroom_name ?? r.class_name, quizRows: 0 });
    }
    classes.get(id).quizRows += 1;
  }
  const fixtureRows = rows.filter(
    (r) => Number(r.quiz_id) === FIXTURE.quizId && String(r.session_id) === FIXTURE.sessionId,
  );
  return {
    rowCount: rows.length,
    classCount: classes.size,
    classes: [...classes.values()].sort((a, b) => a.classroom_name?.localeCompare(b.classroom_name ?? '') ?? 0),
    fixtureRowCount: fixtureRows.length,
    fixtureInClass: fixtureRows[0]?.classroom_id ?? null,
  };
}

async function main() {
  if (!existsSync(credFile)) process.exit(2);
  const labels = await loadFixtureLabels();
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const instructor = await loginDevApi(cfg.accounts.instructor.username, cfg.accounts.instructor.password);

  const ranges = { default: defaultRange(), fixture: fixtureRange() };
  const report = {
    at: new Date().toISOString(),
    account: 'instructor',
    classLabel: labels.classLabel,
    timezoneNote: 'Date boundaries use UTC ISO YYYY-MM-DD slices (Quiz-React AnalyticsPage parity).',
    totals: {},
  };

  for (const [key, range] of Object.entries(ranges)) {
    report.totals[key] = {
      created_from: range.from,
      created_to: range.to,
      ...(await fetchAll(instructor.token, range.from, range.to)),
    };
  }

  report.parity = {
    defaultVsFixture: {
      rowDelta: report.totals.fixture.rowCount - report.totals.default.rowCount,
      classDelta: report.totals.fixture.classCount - report.totals.default.classCount,
    },
    fixture479: {
      inDefaultRange: report.totals.default.fixtureRowCount > 0,
      inFixtureRange: report.totals.fixture.fixtureRowCount > 0,
    },
  };

  writeFileSync(join(evidence, 'instructor-analytics-totals.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, report }));
}

main().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
