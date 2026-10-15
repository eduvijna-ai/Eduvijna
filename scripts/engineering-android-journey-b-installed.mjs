/**
 * Journey B on installed release APK (Maestro login, no Metro bundle gate).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFixtureAnalyticsQuizPage } from './lib/founder-fixture.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const apkSha = process.env.ENGINEERING_APK_IMPLEMENTATION_SHA || '2fb85b0';

const quizHint = await loadFixtureAnalyticsQuizPage();
console.log(
  JSON.stringify({
    step: 'api_fixture_probe',
    found: quizHint.found,
    page: quizHint.page,
    index: quizHint.index,
    totalPages: quizHint.totalPages,
  }),
);

const child = spawnSync(
  process.execPath,
  [join(repoRoot, 'scripts', 'android-founder-journeys.mjs'), 'b'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'inherit',
    env: {
      ...process.env,
      ENGINEERING_INSTALLED_RELEASE: '1',
      ENGINEERING_PHYSICAL_DEVICE: process.env.ENGINEERING_PHYSICAL_DEVICE || '1',
      ENGINEERING_APK_IMPLEMENTATION_SHA: apkSha,
    },
  },
);
process.exit(child.status ?? 1);
