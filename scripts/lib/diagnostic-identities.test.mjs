import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyDiagnosticDelta,
  collectTypeScriptIdentities,
  diffIdentities,
  diffGenuineIdentities,
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

test('parses CRLF TypeScript diagnostic lines on Windows', () => {
  const out = collectTypeScriptIdentities(
    'App.tsx(48,1): error TS6133: unused.\r\nsrc/foo.ts(2,1): error TS2322: mismatch.\r',
  );
  assert.equal(out.length, 2);
  assert.ok(out.some((id) => id.startsWith('App.tsx|TS6133|')));
});

test('normalizes ESLint paths under stack-validation checkout dirs', () => {
  const json = JSON.stringify([
    {
      filePath:
        'C:/Users/kanne/dev/Eduvijna/.stack-validation-logs/rc-pr26-candidate/src/foo.ts',
      messages: [
        { severity: 2, ruleId: 'no-empty', message: 'empty', line: 1, column: 1 },
      ],
    },
  ]);
  const ids = parseEslintJsonReport(json, 'C:/Users/kanne/dev/Eduvijna/.stack-validation-logs/rc-pr26-candidate');
  assert.deepEqual(ids, ['src/foo.ts|no-empty|empty|1:1']);
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

test('eslint line-only shift is classified as relocated not genuine', () => {
  const base = ['src/a.ts|no-empty|empty|10:1'];
  const head = ['src/a.ts|no-empty|empty|40:1'];
  const delta = classifyDiagnosticDelta(head, base, 'eslint');
  assert.equal(delta.relocated.length, 1);
  assert.equal(delta.genuinelyIntroduced.length, 0);
  assert.deepEqual(diffGenuineIdentities(head, base, 'eslint'), []);
});

test('preserves multiplicity of identical TS diagnostics in one file', () => {
  const out = collectTypeScriptIdentities(`
src/foo.ts(1,1): error TS6133: 'x' is declared but its value is never read.
src/foo.ts(2,1): error TS6133: 'x' is declared but its value is never read.
`);
  assert.equal(out.length, 2);
  assert.equal(out[0], out[1]);
});

test('eslint second identical relocation key occurrence is genuinely introduced', () => {
  const base = ['src/a.ts|no-empty|empty|10:1'];
  const head = [
    'src/a.ts|no-empty|empty|10:1',
    'src/a.ts|no-empty|empty|40:1',
  ];
  const delta = classifyDiagnosticDelta(head, base, 'eslint');
  assert.equal(delta.genuinelyIntroduced.length, 1);
  assert.equal(delta.ambiguous.length, 1);
  assert.deepEqual(diffGenuineIdentities(head, base, 'eslint'), [
    'src/a.ts|no-empty|empty|40:1',
  ]);
});

test('eslint new rule occurrence is genuinely introduced', () => {
  const base = ['src/a.ts|no-empty|empty|10:1'];
  const head = [...base, 'src/b.ts|no-empty|empty|1:1'];
  const delta = classifyDiagnosticDelta(head, base, 'eslint');
  assert.equal(delta.genuinelyIntroduced.length, 1);
  assert.match(delta.genuinelyIntroduced[0], /^src\/b\.ts\|/);
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
