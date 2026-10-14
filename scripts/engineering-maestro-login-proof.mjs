/**
 * Prove Maestro can drive real release login (no credential logging).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = resolveDevApiCredentialsPath(repoRoot);
const outDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `maestro-login-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);

function resolveMaestroBin() {
  const candidates = [
    process.env.MAESTRO_BIN,
    join(process.env.USERPROFILE || '', '.maestro-cli', 'maestro', 'bin', 'maestro.bat'),
    join(process.env.USERPROFILE || '', '.maestro', 'bin', 'maestro.bat'),
    join(process.env.USERPROFILE || '', '.maestro', 'maestro', 'bin', 'maestro.bat'),
    'maestro',
  ].filter(Boolean);
  for (const c of candidates) {
    if (c === 'maestro') return c;
    try {
      readFileSync(c);
      return c;
    } catch {
      /* try next */
    }
  }
  return 'maestro';
}

function pickAccount(role) {
  const { accounts } = JSON.parse(readFileSync(credFile, 'utf8'));
  const entry = accounts?.[role] ?? accounts?.student;
  const email = entry?.username ?? entry?.email;
  const password = entry?.password;
  if (!email || !password) {
    throw new Error(`Missing ${role} credentials in .dev-api-credentials.local.json`);
  }
  return { email, password };
}

const role = process.argv[2] || 'student';
const account = pickAccount(role);
const maestro = resolveMaestroBin();
const flow = join(repoRoot, '.maestro', 'engineering-release-login.yaml');
const device = process.env.ADB_DEVICE || 'emulator-5554';

mkdirSync(outDir, { recursive: true });

const env = {
  ...process.env,
  LOGIN_EMAIL: account.email,
  LOGIN_PASSWORD: account.password,
  MAESTRO_DRIVER_STARTUP_TIMEOUT: '120000',
};

function maestroSpawn(args) {
  const lower = maestro.toLowerCase();
  if (lower.endsWith('.bat') || lower.endsWith('.cmd')) {
    return spawnSync('cmd.exe', ['/c', maestro, ...args], {
      env,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true,
    });
  }
  return spawnSync(maestro, args, {
    env,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  });
}

let maestroVersion = 'unknown';
try {
  const ver = maestroSpawn(['--version']);
  maestroVersion = (ver.stdout || ver.stderr || '').trim();
} catch {
  /* optional */
}

const run = maestroSpawn([
  '--device',
  device,
  'test',
  flow,
  '-e',
  `LOGIN_EMAIL=${account.email}`,
  '-e',
  `LOGIN_PASSWORD=${account.password}`,
  '--format',
  'junit',
  '--output',
  join(outDir, 'maestro.xml'),
  '--debug-output',
  join(outDir, 'maestro-debug'),
]);

const logcat = spawnSync(
  'adb',
  ['-s', device, 'logcat', '-d', '-t', '400'],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
);
const logLines = (logcat.stdout || '').split('\n');
const loginSignals = logLines.filter(
  (l) =>
    /login|auth|token|\/api\/v1\/auth/i.test(l) &&
    !/password|passwd|Authorization: Bearer ey/i.test(l),
);
writeFileSync(join(outDir, 'logcat-login-signals-redacted.txt'), loginSignals.join('\n'), 'utf8');

const result = {
  harnessGitHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).stdout?.trim(),
  maestroBin: maestro,
  maestroVersion,
  adbDevice: device,
  role,
  emailLength: String(account.email).length,
  maestroExit: run.status,
  maestroStdoutTail: (run.stdout || '').slice(-2000),
  maestroStderrTail: (run.stderr || '').slice(-2000),
  loginSignalLineCount: loginSignals.length,
  pass: run.status === 0,
};
writeFileSync(join(outDir, 'results.json'), JSON.stringify(result, null, 2), 'utf8');
process.stdout.write(`${JSON.stringify({ outDir, pass: result.pass })}\n`);
process.exit(run.status === 0 ? 0 : 1);
