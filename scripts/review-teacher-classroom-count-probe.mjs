/**
 * Live compare instructor class_wise_students unique classroom count vs summary-derived count.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, '.stack-validation-logs', 'review-api-probes-20261018');
mkdirSync(outDir, { recursive: true });

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

  const classWise = await fetch(
    `${base}/api/v1/dashboard/quizzes?view_type=class_wise_students&limit=1000&offset=0`,
    { headers: auth },
  );
  const classBody = await classWise.json();
  const classRows = Array.isArray(classBody?.data) ? classBody.data : [];
  const unique = new Set(
    classRows.map((r) => String(r.classroom_id || r.class_id || '')).filter(Boolean),
  );
  const reported =
    classBody?.pagination?.total ?? classBody?.meta?.total_count ?? null;

  const summary = await fetch(
    `${base}/api/v1/dashboard/quizzes?view_type=summary&limit=1000&offset=0`,
    { headers: auth },
  );
  const summaryBody = await summary.json();
  const summaryRows = Array.isArray(summaryBody?.data) ? summaryBody.data : [];
  const summaryUnique = new Set();
  for (const q of summaryRows) {
    if (q.classroom_id && q.classroom_name) summaryUnique.add(String(q.classroom_id));
  }

  const evidence = {
    apiBase: base,
    classWiseStatus: classWise.status,
    classWiseRowCount: classRows.length,
    uniqueClassroomIds: unique.size,
    reportedTotal: reported,
    reportedMatchesUnique: reported === unique.size,
    summaryUniqueNamedClassrooms: summaryUnique.size,
    sampleNames: classRows.slice(0, 8).map((r) => ({
      id: r.classroom_id || r.class_id,
      name: r.classroom_name || r.name,
    })),
    kpiShouldUse: unique.size,
  };

  const outPath = join(outDir, 'teacher-classroom-count-live.json');
  writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify({
      outPath,
      unique: unique.size,
      summaryUnique: summaryUnique.size,
      reported,
      reportedMatchesUnique: evidence.reportedMatchesUnique,
    }),
  );
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
