#!/usr/bin/env node
/**
 * Verify ENGINEERING_IMPLEMENTATION_SHA embedded in a release APK bundle.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const apkPath =
  process.argv[2] ||
  join(
    repoRoot,
    '.stack-validation-logs',
    'founder-acceptance',
    `eduvijna-acceptance-release-${process.argv[3] || 'HEAD'}-universal.apk`,
  );

const expectedSha = (
  process.env.EXPECTED_IMPLEMENTATION_SHA || execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' })
).trim();

function sha256File(path) {
  return execSync(`certutil -hashfile "${path}" SHA256`, { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^[0-9A-F]{64}$/i.test(l));
}

function scanBundleForSha(bundlePath) {
  const buf = readFileSync(bundlePath);
  return buf.includes(expectedSha) || buf.includes('ENGINEERING_IMPLEMENTATION_SHA');
}

const listing = execSync(`jar tf "${apkPath}"`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const entries = listing.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const bundleEntry =
  entries.find((l) => /index\.android\.bundle(\.hbc)?$/.test(l)) ||
  entries.find((l) => l.includes('index.android.bundle'));

if (!bundleEntry) {
  console.error('no_bundle_entry_in_apk');
  process.exit(2);
}

const tmpDir = join(repoRoot, '.stack-validation-logs', 'bundle-sha-verify-tmp');
mkdirSync(tmpDir, { recursive: true });
execSync(`jar xf "${apkPath}" "${bundleEntry}"`, { cwd: tmpDir, stdio: 'ignore' });
const extracted = join(tmpDir, bundleEntry);
const found = scanBundleForSha(extracted);

const record = {
  verifiedAt: new Date().toISOString(),
  apkPath,
  apkSha256: sha256File(apkPath),
  expectedImplementationSha: expectedSha,
  bundleEntry,
  implementationShaFoundInBundle: found,
};
const outDir = join(repoRoot, '.stack-validation-logs', 'engineering-installed-smoke');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'embedded-bundle-sha-verify-latest.json'), JSON.stringify(record, null, 2));
console.log(JSON.stringify(record, null, 2));
process.exit(found ? 0 : 1);
