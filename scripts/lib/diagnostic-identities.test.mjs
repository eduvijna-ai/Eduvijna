import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectTypeScriptIdentities,
  diffIdentities,
  parseEslintJsonReport,
  parseTypeScriptDiagnosticLine,
} from './diagnostic-identities.mjs';

test('same TS code in another file is a distinct identity', () => {
  const a = parseTypeScriptDiagnosticLine(
    'src/screens/A.tsx(10,2): error TS2304: Cannot find name foo.',
  );
  const b = parseTypeScriptDiagnosticLine(
    'src/screens/B.tsx(10,2): error TS2304: Cannot find name foo.',
  );
  assert.notEqual(a.identity, b.identity);
});

test('line-only shifts do not collapse duplicate codes', () => {
  const out = collectTypeScriptIdentities(`
src/foo.ts(1,1): error TS6133: 'x' is declared but its value is never read.
src/foo.ts(40,1): error TS6133: 'y' is declared but its value is never read.
`);
  assert.equal(out.length, 2);
});

test('parses ESLint JSON with file paths and rule IDs', () => {
  const json = JSON.stringify([
    {
      filePath: 'src/screens/A.tsx',
      messages: [{ severity: 2, ruleId: '@typescript-eslint/no-unused-vars', message: 'x', line: 1, column: 2 }],
    },
    {
      filePath: 'src/screens/B.tsx',
      messages: [{ severity: 2, ruleId: '@typescript-eslint/no-unused-vars', message: 'x', line: 1, column: 2 }],
    },
  ]);
  const ids = parseEslintJsonReport(json);
  assert.equal(ids.length, 2);
  assert.match(ids[0], /^screens\/A\.tsx\|/);
  assert.match(ids[1], /^screens\/B\.tsx\|/);
});

test('baseline debt identities are excluded from added set', () => {
  const base = collectTypeScriptIdentities(
    'src/legacy.ts(2,1): error TS2571: Object is of type unknown.',
  );
  const head = [
    ...base,
    ...collectTypeScriptIdentities('src/new.ts(3,1): error TS2322: Type mismatch.'),
  ];
  const added = diffIdentities(head, base);
  assert.deepEqual(added, ['new.ts|TS2322|Type mismatch.']);
});
