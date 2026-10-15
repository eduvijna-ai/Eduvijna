#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENGINEERING_METRO_PORT,
  ENGINEERING_REPO_ROOT,
} from './lib/engineering-runtime-target.mjs';
import {
  startEngineeringMetroDetached,
  waitForEngineeringBundleReady,
  writeMetroReadinessFailure,
  writeMetroActiveSession,
} from './lib/android-engineering-runtime-prep.mjs';

const repoRoot = ENGINEERING_REPO_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');
const evidenceRoot = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence');

const metro = startEngineeringMetroDetached(evidenceRoot);
console.log(
  JSON.stringify({
    step: 'metro_started',
    pid: metro.pid,
    port: ENGINEERING_METRO_PORT,
    executable: metro.executable,
    cliEntry: metro.cliEntry,
    stdoutLog: metro.stdoutLog,
    stderrLog: metro.stderrLog,
  }),
);

const bundleWait = await waitForEngineeringBundleReady({
  metroPid: metro.pid,
  metroLaunch: metro,
  evidenceRoot,
});
if (!bundleWait.ok) {
  const failure = {
    metro_process_started: true,
    metro_http_ready: bundleWait.metroHttpReady,
    metro_process_exited_early: bundleWait.metroProcessExitedEarly ?? false,
    bundle_marker_found: bundleWait.bundleMarkerFound,
    runnerGitHeadSha: bundleWait.runnerGitHeadSha,
    loadedBuildSha: bundleWait.loadedBuildSha,
    error: bundleWait.error,
    bundleProbe: bundleWait.probe,
    metroStdoutLog: bundleWait.metroStdoutLog ?? metro.stdoutLog,
    metroStderrLog: bundleWait.metroStderrLog ?? metro.stderrLog,
    metroLaunch: bundleWait.metroLaunch ?? metro,
  };
  writeMetroReadinessFailure(evidenceRoot, failure);
  console.error(JSON.stringify({ step: 'metro_not_ready', ...failure }));
  process.exit(1);
}

writeMetroActiveSession(evidenceRoot, bundleWait);
console.log(
  JSON.stringify({
    step: 'metro_ready',
    port: ENGINEERING_METRO_PORT,
    runnerGitHeadSha: bundleWait.runnerGitHeadSha,
    loadedBuildSha: bundleWait.loadedBuildSha,
    bundleMarkerFound: bundleWait.bundleMarkerFound,
    attempts: bundleWait.attempts,
  }),
);
