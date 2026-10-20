/**
 * Live verify pending check-record class IDs resolve via view_type=classes lookup
 * for the student fixture account (food.pdf / DEV_* rows). Sanitized output only.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { FIXTURE } from './lib/founder-fixture.mjs';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, '.stack-validation-logs', 'review-api-probes-20261018');
mkdirSync(outDir, { recursive: true });

function isOpaque(id) {
  return /^class_[0-9a-f]{8}$/i.test(String(id || '').trim());
}

async function main() {
  const credPath = resolveDevApiCredentialsPath(repoRoot);
  if (!existsSync(credPath)) {
    throw new Error(`credentials_missing:${credPath}`);
  }
  const cfg = JSON.parse(readFileSync(credPath, 'utf8'));
  const base = getDevApiBase();
  const student = await loginDevApi(cfg.accounts.student.username, cfg.accounts.student.password);
  const auth = { Authorization: `Bearer ${student.token}`, 'Content-Type': 'application/json' };

  const checkRes = await fetch(`${base}/api/v1/quiz/check-record`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      p_student_id: String(FIXTURE.studentId),
      p_session_id: null,
      p_check_type: 'pending',
    }),
  });
  const checkBody = await checkRes.json();
  const rows = Array.isArray(checkBody?.result) ? checkBody.result : [];

  const classesRes = await fetch(
    `${base}/api/v1/dashboard/quizzes?view_type=classes&limit=200&offset=0`,
    { headers: auth },
  );
  const classesBody = await classesRes.json();
  const classRows = Array.isArray(classesBody?.data) ? classesBody.data : [];
  const lookup = new Map();
  for (const row of classRows) {
    const name = row.classroom_name || row.name;
    for (const id of [row.classroom_id, row.class_id, row.classid].filter(Boolean)) {
      if (name && String(name) !== String(id)) lookup.set(String(id), String(name));
    }
  }

  const interesting = rows
    .map((row) => {
      const topic = String(row?.quiz_details?.topic || '');
      const classid = String(row?.classid || '');
      const resolved = lookup.get(classid) || null;
      return {
        topic: topic.slice(0, 80),
        classid,
        opaque: isOpaque(classid),
        lookupHit: Boolean(resolved),
        resolvedName: resolved,
        wouldShowUnknown: !resolved && (!row?.quiz_details?.classroom_name || isOpaque(row?.quiz_details?.classroom_name)),
      };
    })
    .filter(
      (r) =>
        /food\.pdf|DEV_|MATRIX|DOC/i.test(r.topic) ||
        r.wouldShowUnknown ||
        r.opaque,
    )
    .slice(0, 40);

  const evidence = {
    apiBase: base,
    checkRecordStatus: checkRes.status,
    pendingRowCount: rows.length,
    classesViewStatus: classesRes.status,
    classesRowCount: classRows.length,
    lookupSize: lookup.size,
    interesting,
    unresolvedOpaqueIds: interesting.filter((r) => r.opaque && !r.lookupHit).map((r) => r.classid),
    conclusion:
      interesting.filter((r) => r.opaque && !r.lookupHit).length === 0
        ? 'LOOKUP_COVERS_PENDING_OPAQUE_IDS (or no opaque pending rows in sample)'
        : 'UNRESOLVED_OPAQUE_CLASS_IDS remain after authorized classes view — do not invent names',
  };

  const outPath = join(outDir, 'pending-classroom-names-live.json');
  writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify({
      outPath,
      conclusion: evidence.conclusion,
      unresolved: evidence.unresolvedOpaqueIds.length,
      lookupSize: lookup.size,
      pending: rows.length,
    }),
  );
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
