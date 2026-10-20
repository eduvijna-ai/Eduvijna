import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDevClientOverlays, getAndroidSerial } from './lib/android-engineering-runtime-prep.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence');
const serial = process.env.ANDROID_SERIAL || getAndroidSerial();

const result = resolveDevClientOverlays(serial, evidence, { maxIterations: 8 });
console.log(
  JSON.stringify({
    ok: result.ok,
    screen: result.screen,
    error: result.error ?? null,
    steps: result.lastSuccessfulAction ?? null,
  }),
);
