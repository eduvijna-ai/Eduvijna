/**
 * Logout A: UI logout clears session; relaunch stays on login; back does not reopen protected shell.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmulatorLoginHarness } from './lib/emulator-login-harness.mjs';
import { performUiLogout } from './lib/ui-logout-harness.mjs';
import { resolveMaestroJavaHome } from './lib/resolve-maestro-java-home.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `logout-session-smoke-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
mkdirSync(evidenceDir, { recursive: true });

const javaHome = resolveMaestroJavaHome();
const maestro = spawnSync(
  process.execPath,
  [join(repoRoot, 'scripts', 'engineering-maestro-login-proof.mjs'), 'instructor'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...(javaHome ? { JAVA_HOME: javaHome } : {}) },
  },
);
if (maestro.status !== 0) process.exit(1);

const h = createEmulatorLoginHarness();
const logout = performUiLogout({
  adb: h.adb,
  sleep: h.sleep,
  dumpUi: h.dumpUi,
  dismissPostLoginInterstitials: h.dismissPostLoginInterstitials,
  authenticatedMarker: h.authenticatedMarker,
});
writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify({ ok: logout.ok, reason: logout.reason, steps: logout.steps, evidenceDir }, null, 2));
console.log(JSON.stringify({ ok: logout.ok, evidenceDir }));
process.exit(logout.ok ? 0 : 1);
