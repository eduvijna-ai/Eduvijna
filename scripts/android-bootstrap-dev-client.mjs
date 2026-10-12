/**
 * Bring Android dev client to app login/home (deterministic engineering runtime prep).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loginDevApi } from './lib/dev-api-auth.mjs';
import { prepareAndroidEngineeringRuntime } from './lib/android-engineering-runtime-prep.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';

async function runAndroidLogin(role) {
  const loginScript = join(repoRoot, 'scripts', 'android-login.mjs');
  const result = spawnSync('node', [loginScript, role, '--skip-runtime-prep'], {
    encoding: 'utf8',
    env: { ...process.env, ANDROID_SERIAL: serial },
  });
  const reportPath = join(
    repoRoot,
    '.dev-api-document-workflow-run',
    'runtime-evidence',
    'android-login',
    `login-${role}-report.json`,
  );
  let report = null;
  if (existsSync(reportPath)) {
    report = JSON.parse(readFileSync(reportPath, 'utf8'));
  }
  const loggedIn = report?.pass === true;
  const reason = report?.firstFailingBoundary ?? report?.outcome ?? 'login_script_failed';
  if (result.status !== 0 && !loggedIn) {
    return { loggedIn: false, reason, milestones: report?.milestones ?? [] };
  }
  return {
    loggedIn,
    reason: loggedIn ? report?.outcome ?? 'authenticated_shell' : reason,
    milestones: report?.milestones ?? [],
  };
}

const role = process.argv[2] || 'instructor';
const fresh = process.argv.includes('--fresh');
const restartMetro = !process.argv.includes('--no-metro-restart');

const prep = await prepareAndroidEngineeringRuntime({
  fresh,
  restartMetro,
  relaunchDevClient: true,
  evidenceRoot: evidence,
});

if (!prep.ok) {
  writeFileSync(
    join(evidence, 'android-bootstrap-result.json'),
    JSON.stringify({ role, ok: false, prep: prep.report, at: new Date().toISOString() }, null, 2),
  );
  console.log(JSON.stringify({ ok: false, prep: prep.report }));
  process.exit(1);
}

const loginResult = await runAndroidLogin(role);
if (existsSync(credFile)) {
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const account = cfg.accounts?.[role];
  if (account?.username && account?.password) {
    await loginDevApi(account.username, account.password);
  }
}
writeFileSync(
  join(evidence, 'android-bootstrap-result.json'),
  JSON.stringify(
    { role, ok: loginResult.loggedIn, prep: prep.report, loginResult, at: new Date().toISOString() },
    null,
    2,
  ),
);
console.log(JSON.stringify({ ok: loginResult.loggedIn, loginResult, prepOk: prep.ok }));
if (!loginResult.loggedIn) process.exit(1);
