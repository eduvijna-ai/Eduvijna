/**
 * Summarize stack matrix genuine/ambiguous findings vs final candidate survival.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveMonorepoRoot } from './stack-worktree-paths.mjs';

const scriptRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const monorepoRoot = resolveMonorepoRoot(scriptRoot);
const reportPath = join(monorepoRoot, 'docs/development/e2e-fixtures/stack-validation-report.json');

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const rows = [];
for (const b of report.branches ?? []) {
  const added = b.diagnostics?.identitiesAdded ?? {};
  const hasGenuineFields =
    added.tsGenuineAdded !== undefined || added.eslintGenuineAdded !== undefined;
  rows.push({
    pr: b.pr,
    head: b.head,
    reportSliceStale: !hasGenuineFields,
    tsGenuine: hasGenuineFields ? (added.tsGenuineAdded?.length ?? 0) : null,
    eslintGenuine: hasGenuineFields ? (added.eslintGenuineAdded?.length ?? 0) : null,
    rawTsAdded: added.tsAdded?.length ?? 0,
    rawEslintAdded: added.eslintAdded?.length ?? 0,
    tsAmbiguous: added.tsClassification?.ambiguous?.length ?? 0,
    eslintAmbiguous: added.eslintClassification?.ambiguous?.length ?? 0,
    tsGenuineSamples: (added.tsGenuineAdded ?? []).slice(0, 5),
    eslintGenuineSamples: (added.eslintGenuineAdded ?? []).slice(0, 5),
    eslintAmbiguousSamples: (added.eslintClassification?.ambiguous ?? []).slice(0, 5),
  });
}

const pr26 = rows.find((r) => r.pr === 26);
const survivesInFinalCandidate = {
  pr26Gate: pr26
    ? {
        tsGenuine: pr26.tsGenuine,
        eslintGenuine: pr26.eslintGenuine,
        tsAmbiguous: pr26.tsAmbiguous,
        eslintAmbiguous: pr26.eslintAmbiguous,
      }
    : null,
  note:
    'Aggregate matrix status remains diagnostic_regression when any historical PR slice vs its immediate base reports genuine additions. Release gate for integration is PR #26 row (vs phase6 d87a332).',
};

const out = {
  generatedAt: new Date().toISOString(),
  matrixReport: reportPath,
  matrixStatus: report.status,
  perPr: rows,
  survivesInFinalCandidate,
  babelOverrideDisclosure:
    'Matrix exports use withStackExportBabelConfig (copies monorepo babel.config.js into each worktree). Committed-babel export is separate (pr26-committed-babel).',
};

const outPath = join(monorepoRoot, '.stack-validation-logs', 'stack-gate-disposition.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${outPath}`);
