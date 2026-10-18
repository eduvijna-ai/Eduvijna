/**
 * Live compare instructor Assessments (summary) vs Analytics (all) membership
 * for the same classroom, All Time vs default date window.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, '.stack-validation-logs', 'review-api-probes-20261018');
mkdirSync(outDir, { recursive: true });

const CLASSROOM_NAME = '4A-Mathematics';
const PAGE = 100;

function assignmentKey(row) {
  return `${row.quiz_id}::${row.session_id ?? ''}::${row.classroom_id ?? ''}`;
}

function availabilityBucket(row) {
  const a = String(row.availability_status || '').toLowerCase();
  if (a === 'active') return 'active';
  if (a === 'coming soon' || a === 'available_soon' || a === 'upcoming') return 'upcoming';
  if (a === 'expired') return 'expired';
  return a || 'unknown';
}

async function fetchAll(base, auth, viewType, extra = {}) {
  const rows = [];
  let offset = 0;
  let pages = 0;
  let lastBody = null;
  while (pages < 50) {
    const q = new URLSearchParams({
      view_type: viewType,
      limit: String(PAGE),
      offset: String(offset),
      ...Object.fromEntries(
        Object.entries(extra).filter(([, v]) => v != null && v !== ''),
      ),
    });
    const res = await fetch(`${base}/api/v1/dashboard/quizzes?${q}`, { headers: auth });
    const body = await res.json();
    lastBody = body;
    const page = Array.isArray(body?.data) ? body.data : [];
    pages += 1;
    rows.push(...page);
    const hasMore = body?.pagination?.hasMore ?? body?.pagination?.has_more;
    const next = body?.pagination?.next_offset ?? body?.pagination?.nextOffset;
    if (hasMore === false) break;
    if (hasMore === true) {
      if (page.length === 0) break;
      offset = Number.isFinite(Number(next)) && Number(next) > offset ? Number(next) : offset + PAGE;
      continue;
    }
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return { rows, pages, lastBody, status: lastBody ? 200 : 0 };
}

function summarize(rows, classroomId) {
  const scoped = classroomId
    ? rows.filter((r) => String(r.classroom_id) === String(classroomId))
    : rows;
  const keys = scoped.map(assignmentKey);
  const unique = [...new Set(keys)];
  const buckets = { active: 0, upcoming: 0, expired: 0, unknown: 0 };
  for (const r of scoped) {
    const b = availabilityBucket(r);
    buckets[b] = (buckets[b] || 0) + 1;
  }
  let completed = 0;
  let pending = 0;
  for (const r of scoped) {
    completed += Number(r.completed_count) || 0;
    pending += Number(r.pending_count) || 0;
  }
  return {
    rowCount: scoped.length,
    uniqueAssignments: unique.length,
    duplicateKeys: keys.length - unique.length,
    buckets,
    cohortCompletedSum: completed,
    cohortPendingSum: pending,
    keys: unique.sort(),
  };
}

function diffKeys(a, b) {
  const as = new Set(a);
  const bs = new Set(b);
  return {
    onlyInA: [...as].filter((k) => !bs.has(k)),
    onlyInB: [...bs].filter((k) => !as.has(k)),
  };
}

async function main() {
  const credPath = resolveDevApiCredentialsPath(repoRoot);
  if (!existsSync(credPath)) throw new Error(`credentials_missing:${credPath}`);
  const cfg = JSON.parse(readFileSync(credPath, 'utf8'));
  const base = getDevApiBase();
  const instructor = await loginDevApi(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );
  const auth = { Authorization: `Bearer ${instructor.token}` };

  const today = new Date();
  const lastMonth = new Date(today);
  lastMonth.setMonth(today.getMonth() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const defaultFrom = lastMonth.toISOString().split('T')[0];
  const defaultTo = tomorrow.toISOString().split('T')[0];

  const summaryAll = await fetchAll(base, auth, 'summary');
  const allAllTime = await fetchAll(base, auth, 'all');
  const allDefaultWindow = await fetchAll(base, auth, 'all', {
    created_from: defaultFrom,
    created_to: defaultTo,
  });
  const allLimit500 = await fetch(
    `${base}/api/v1/dashboard/quizzes?view_type=all&limit=500&offset=0&created_from=${defaultFrom}&created_to=${defaultTo}`,
    { headers: auth },
  );
  const allLimit500Body = await allLimit500.json();
  const allLimit500Rows = Array.isArray(allLimit500Body?.data) ? allLimit500Body.data : [];

  const classroom =
    summaryAll.rows.find((r) => String(r.classroom_name || '').includes(CLASSROOM_NAME)) ||
    allAllTime.rows.find((r) => String(r.classroom_name || '').includes(CLASSROOM_NAME));
  const classroomId = classroom?.classroom_id || null;

  const summaryClass = summarize(summaryAll.rows, classroomId);
  const allTimeClass = summarize(allAllTime.rows, classroomId);
  const windowClass = summarize(allDefaultWindow.rows, classroomId);
  const limit500Class = summarize(allLimit500Rows, classroomId);

  const summaryVsAllTime = diffKeys(summaryClass.keys, allTimeClass.keys);
  const summaryVsWindow = diffKeys(summaryClass.keys, windowClass.keys);

  const evidence = {
    verifiedAt: new Date().toISOString(),
    apiBase: base,
    account: cfg.accounts.instructor.username,
    classroomName: CLASSROOM_NAME,
    classroomId,
    defaultWindow: { from: defaultFrom, to: defaultTo },
    summaryAllTime: {
      pages: summaryAll.pages,
      globalRows: summaryAll.rows.length,
      class: summaryClass,
    },
    analyticsAllTimePaginated: {
      pages: allAllTime.pages,
      globalRows: allAllTime.rows.length,
      class: allTimeClass,
    },
    analyticsDefaultWindowPaginated: {
      pages: allDefaultWindow.pages,
      globalRows: allDefaultWindow.rows.length,
      class: windowClass,
    },
    analyticsDefaultWindowLimit500SinglePage: {
      status: allLimit500.status,
      globalRows: allLimit500Rows.length,
      pagination: allLimit500Body?.pagination ?? null,
      class: limit500Class,
    },
    membershipDiff: {
      summaryVsAllTimePaginated: {
        missingFromAnalytics: summaryVsAllTime.onlyInA,
        extraInAnalytics: summaryVsAllTime.onlyInB,
        missingCount: summaryVsAllTime.onlyInA.length,
        extraCount: summaryVsAllTime.onlyInB.length,
      },
      summaryVsDefaultWindow: {
        missingFromAnalytics: summaryVsWindow.onlyInA.slice(0, 40),
        missingCount: summaryVsWindow.onlyInA.length,
        extraCount: summaryVsWindow.onlyInB.length,
      },
    },
    note:
      'Assessments mobile uses view_type=summary limit=1000 All Time. Teacher Analytics uses view_type=all limit=500 with created_from/to default window.',
  };

  // Redact keys in file if huge — keep counts + first few
  evidence.summaryAllTime.class.keys = evidence.summaryAllTime.class.keys.slice(0, 8);
  evidence.analyticsAllTimePaginated.class.keys = evidence.analyticsAllTimePaginated.class.keys.slice(0, 8);
  evidence.analyticsDefaultWindowPaginated.class.keys =
    evidence.analyticsDefaultWindowPaginated.class.keys.slice(0, 8);
  evidence.analyticsDefaultWindowLimit500SinglePage.class.keys =
    evidence.analyticsDefaultWindowLimit500SinglePage.class.keys.slice(0, 8);
  evidence.membershipDiff.summaryVsAllTimePaginated.missingFromAnalytics =
    evidence.membershipDiff.summaryVsAllTimePaginated.missingFromAnalytics.slice(0, 20);
  evidence.membershipDiff.summaryVsAllTimePaginated.extraInAnalytics =
    evidence.membershipDiff.summaryVsAllTimePaginated.extraInAnalytics.slice(0, 20);

  const outPath = join(outDir, 'analytics-assessments-membership-live.json');
  writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify(
      {
        outPath,
        classroomId,
        summaryClass: summaryClass.uniqueAssignments,
        summaryBuckets: summaryClass.buckets,
        allTimeClass: allTimeClass.uniqueAssignments,
        windowClass: windowClass.uniqueAssignments,
        limit500Class: limit500Class.uniqueAssignments,
        missingAllTime: evidence.membershipDiff.summaryVsAllTimePaginated.missingCount,
        missingWindow: evidence.membershipDiff.summaryVsDefaultWindow.missingCount,
        summaryCohortPending: summaryClass.cohortPendingSum,
        allTimeCohortPending: allTimeClass.cohortPendingSum,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
