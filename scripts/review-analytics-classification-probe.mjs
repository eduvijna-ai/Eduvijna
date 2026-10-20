/**
 * Live-API validation of status-first student analytics classification
 * against deployed-web contract (student_total_details).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, '.stack-validation-logs', 'review-api-probes-20261018');
mkdirSync(outDir, { recursive: true });

function classifyAttempt(quiz) {
  const status = String(quiz.student_status ?? quiz.quiz_status ?? '')
    .trim()
    .toLowerCase();
  if (status === 'completed') return 'completed';
  if (status === 'missed') return 'missed';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'pending') return 'pending';
  return 'pending';
}

function classifyAvailability(quiz) {
  const avail = String(quiz.availability_status || '')
    .trim()
    .toLowerCase();
  if (['active', 'expired', 'upcoming', 'not_started', 'available_soon'].includes(avail)) {
    return avail;
  }
  if (quiz.end_time && new Date(quiz.end_time) < new Date()) return 'expired';
  return 'unknown';
}

async function main() {
  const credPath = resolveDevApiCredentialsPath(repoRoot);
  const cfg = JSON.parse(readFileSync(credPath, 'utf8'));
  const student = await loginDevApi(cfg.accounts.student.username, cfg.accounts.student.password);
  const base = getDevApiBase();
  const q = new URLSearchParams({ view_type: 'student_total_details', limit: '200', offset: '0' });
  const res = await fetch(`${base}/api/v1/dashboard/quizzes?${q}`, {
    headers: { Authorization: `Bearer ${student.token}` },
  });
  const body = await res.json();
  const rows = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];

  const buckets = {
    completedNullScore: [],
    pendingWithScore: [],
    inProgressWithScore: [],
    completedExpired: [],
    quizStatusFallback: [],
    scoreWithoutStatus: [],
  };

  for (const row of rows) {
    const attempt = classifyAttempt(row);
    const avail = classifyAvailability(row);
    const score = row.best_score ?? row.latest_score ?? row.score ?? null;
    const hasScore = score != null && Number.isFinite(Number(score));
    const explicitStudent = row.student_status != null && String(row.student_status).trim() !== '';
    const explicitQuiz = row.quiz_status != null && String(row.quiz_status).trim() !== '';

    if (attempt === 'completed' && !hasScore) {
      buckets.completedNullScore.push(row.quiz_id);
    }
    if (attempt === 'pending' && hasScore) {
      buckets.pendingWithScore.push(row.quiz_id);
    }
    if (attempt === 'in_progress' && hasScore) {
      buckets.inProgressWithScore.push(row.quiz_id);
    }
    if (attempt === 'completed' && avail === 'expired') {
      buckets.completedExpired.push(row.quiz_id);
    }
    if (!explicitStudent && explicitQuiz && String(row.quiz_status).toLowerCase() === 'completed') {
      buckets.quizStatusFallback.push(row.quiz_id);
    }
    if (!explicitStudent && !explicitQuiz && hasScore) {
      buckets.scoreWithoutStatus.push(row.quiz_id);
    }
  }

  const summary = {
    api: base,
    status: res.status,
    studentUserId: student.userId,
    rowCount: rows.length,
    statusHistogram: rows.reduce((acc, r) => {
      const k = classifyAttempt(r);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}),
    availabilityHistogram: rows.reduce((acc, r) => {
      const k = classifyAvailability(r);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}),
    contractChecks: {
      completedWithNullScorePresent: buckets.completedNullScore.length > 0,
      pendingOrInProgressWithNumericScorePresent:
        buckets.pendingWithScore.length + buckets.inProgressWithScore.length > 0,
      completedAfterExpiryPresent: buckets.completedExpired.length > 0,
      quizStatusFallbackPresent: buckets.quizStatusFallback.length > 0,
      scoreAloneMustNotCountCompleted: true,
      scoreWithoutStatusCount: buckets.scoreWithoutStatus.length,
    },
    sampleCounts: Object.fromEntries(
      Object.entries(buckets).map(([k, v]) => [k, v.length]),
    ),
  };

  const outPath = join(outDir, 'analytics-classification-live.json');
  writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
