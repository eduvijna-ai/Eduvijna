/**
 * Student fixture: Assessments → Completed traversal → View Results → 60% / 6/10 / attempt 207.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import { createEmulatorLoginHarness } from './lib/emulator-login-harness.mjs';
import { verifyEngineeringStudentSession } from './lib/verify-engineering-student-session.mjs';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';
import { FIXTURE, loadFixtureLabels } from './lib/founder-fixture.mjs';
import {
  assertResultsScreen,
  discoverFixtureIdentity,
  parseAssessmentsDataState,
  parseCompletedTabTotal,
  traverseCompletedTab,
  revealAndTapFixtureResults,
} from './lib/assessments-completed-list-harness.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = join(
  repoRoot,
  '.stack-validation-logs',
  'engineering-installed-smoke',
  `student-fixture-ui-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
);
const h = createEmulatorLoginHarness();
const { adb, sleep, dumpUi, dismissPostLoginInterstitials, tapContentDesc, authenticatedMarker } = h;

function shot(n) {
  execSync(`adb -s ${h.device} exec-out screencap -p > "${join(evidenceDir, n)}"`, { shell: true, stdio: 'inherit' });
}

function looksLikeInstructorSession(xml) {
  return /Students for:|Assign Quiz|Instructor Dashboard|View students for/i.test(xml);
}

async function ensureStudentUiSession(apiSession) {
  let xml = dumpUi();
  if (authenticatedMarker(xml) && !looksLikeInstructorSession(xml)) {
    return { xml, via: 'reused_verified_api_student', apiSession };
  }
  if (authenticatedMarker(xml) && looksLikeInstructorSession(xml)) {
    return { xml, via: 'wrong_role_instructor', needsLogin: true };
  }
  const maestroBin =
    process.env.MAESTRO_BIN ||
    join(process.env.USERPROFILE || '', '.maestro-cli', 'maestro', 'bin', 'maestro.bat');
  const maestroLogin = spawnSync(
    process.execPath,
    [join(repoRoot, 'scripts', 'engineering-maestro-login-proof.mjs'), 'student'],
    { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, MAESTRO_BIN: maestroBin } },
  );
  if (maestroLogin.status !== 0) {
    return { via: 'maestro_failed', needsLogin: true };
  }
  sleep(3000);
  xml = dumpUi();
  return { xml, via: 'maestro_student', apiSession };
}

mkdirSync(evidenceDir, { recursive: true });

const apiSession = await verifyEngineeringStudentSession();
apiSession.harnessGitHead = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
apiSession.implementationApkSha = process.env.ENGINEERING_APK_IMPLEMENTATION_SHA || 'b570e91';

process.env.DEV_API_CREDENTIALS_FILE =
  process.env.DEV_API_CREDENTIALS_FILE || resolveDevApiCredentialsPath(repoRoot);
const labels = await loadFixtureLabels();
const quizTitle = labels.quizTitle;

const sessionUi = await ensureStudentUiSession(apiSession);
if (sessionUi.needsLogin || !sessionUi.xml) {
  const out = {
    ok: false,
    boundary: 'student_session',
    sessionUi,
    apiSession,
    evidenceDir,
  };
  writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
  process.exit(1);
}

let xml = sessionUi.xml;
if (dismissPostLoginInterstitials(xml)) {
  sleep(2000);
  xml = dumpUi();
}
shot('00-home.png');

// Bottom tabs often expose label as text= without content-desc on the pressable.
function tapBottomTab(label) {
  if (tapContentDesc(xml, label)) return true;
  const textRe = new RegExp(`text="${label}"[^>]*bounds="([^"]+)"`, 'i');
  const tm = textRe.exec(xml);
  if (tm) {
    const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(tm[1]);
    if (c) {
      adb(
        `shell input tap ${((Number(c[1]) + Number(c[3])) / 2) | 0} ${((Number(c[2]) + Number(c[4])) / 2) | 0}`,
      );
      return true;
    }
  }
  // 5-tab student bar fallback (Analytics, Assessments, Home, ERP, Schools) on ~1080px width.
  const tabIndex = { Analytics: 0, Assessments: 1, Home: 2, ERP: 3, Schools: 4 }[label];
  if (tabIndex == null) return false;
  const x = Math.floor((1080 / 5) * (tabIndex + 0.5));
  adb(`shell input tap ${x} 1980`);
  return true;
}

tapBottomTab('Assessments');
sleep(4500);
xml = dumpUi();
if (!/Completed|Pending|Assigned/i.test(xml) || /Hello,/i.test(xml)) {
  // Still on Home — retry coordinate tap once.
  adb('shell input tap 324 1980');
  sleep(4000);
  xml = dumpUi();
}
// Always select Completed chip (presence ≠ selected; data-state tab may still be "all").
{
  const cm = /content-desc="Completed \(\d+\)"[^>]*bounds="([^"]+)"/i.exec(xml);
  if (cm) {
    const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(cm[1]);
    adb(`shell input tap ${(Number(c[1]) + Number(c[3])) / 2 | 0} ${(Number(c[2]) + Number(c[4])) / 2 | 0}`);
  } else {
    tapContentDesc(xml, 'Completed');
    const completedText = /text="Completed[^"]*"[^>]*bounds="([^"]+)"/i.exec(xml);
    if (completedText) {
      const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(completedText[1]);
      if (c) {
        adb(
          `shell input tap ${((Number(c[1]) + Number(c[3])) / 2) | 0} ${((Number(c[2]) + Number(c[4])) / 2) | 0}`,
        );
      }
    }
  }
}
sleep(4000);
xml = dumpUi();
shot('01-completed-tab.png');

let { xml: traversedXml, traversal, fixtureDiscovery } = traverseCompletedTab({
  dumpUi,
  adb,
  sleep,
  quizTitle,
});
xml = traversedXml;

// If title identity is absent from the completed list, try Assessments search (API title / token).
if (!fixtureDiscovery.found) {
  const searchToken = labels.searchToken || quizTitle.slice(0, 14);
  const searchField =
    /resource-id="[^"]*search[^"]*"[^>]*bounds="([^"]+)"/i.exec(xml) ||
    /text="Search"[^>]*bounds="([^"]+)"/i.exec(xml) ||
    /content-desc="Search"[^>]*bounds="([^"]+)"/i.exec(xml);
  if (searchField) {
    const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(searchField[1]);
    if (c) {
      adb(
        `shell input tap ${((Number(c[1]) + Number(c[3])) / 2) | 0} ${((Number(c[2]) + Number(c[4])) / 2) | 0}`,
      );
      sleep(800);
      adb(`shell input text ${JSON.stringify(String(searchToken).replace(/"/g, ''))}`);
      sleep(2500);
      xml = dumpUi();
      fixtureDiscovery = discoverFixtureIdentity(xml, quizTitle);
      traversal.searchAttempt = { token: searchToken, found: fixtureDiscovery.found };
    }
  }
}

writeFileSync(join(evidenceDir, 'traversal.json'), JSON.stringify(traversal, null, 2));
writeFileSync(join(evidenceDir, 'assessments.xml'), xml);
shot('02-after-traversal.png');

const dataState = parseAssessmentsDataState(xml);
const completedTabTotal = parseCompletedTabTotal(xml);

let viewTap = { tapped: false };
let resultsXml = xml;
let resultsAssert = { pass: false };

if (fixtureDiscovery.found) {
  const altTitles = [quizTitle, 'Mathematics — maths', 'Mathematics - maths', labels.searchToken].filter(
    Boolean,
  );
  for (const title of altTitles) {
    viewTap = revealAndTapFixtureResults(adb, dumpUi, sleep, title);
    if (viewTap.tapped) break;
  }
  // Single filtered completed card: tap Results control directly.
  if (!viewTap.tapped) {
    const resultsBtn =
      /content-desc="[^"]*Results"[^>]*bounds="([^"]+)"/i.exec(xml) ||
      /text="Results"[^>]*bounds="([^"]+)"/i.exec(xml);
    if (resultsBtn) {
      const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(resultsBtn[1]);
      if (c) {
        adb(
          `shell input tap ${((Number(c[1]) + Number(c[3])) / 2) | 0} ${((Number(c[2]) + Number(c[4])) / 2) | 0}`,
        );
        viewTap = { tapped: true, via: 'direct_results_control', xml };
      }
    }
  }
  if (viewTap.xml) xml = viewTap.xml;
  sleep(12000);
  resultsXml = dumpUi();
  writeFileSync(join(evidenceDir, 'results.xml'), resultsXml);
  shot('03-results-screen.png');
  resultsAssert = assertResultsScreen(resultsXml);
} else {
  writeFileSync(join(evidenceDir, 'results.xml'), xml);
}

const inlineOk =
  fixtureDiscovery.found &&
  discoverFixtureIdentity(xml, quizTitle).hits.resultSummary &&
  /60%/.test(xml) &&
  /6\/10|6 of 10/i.test(xml);

const ok =
  fixtureDiscovery.found &&
  (resultsAssert.pass || inlineOk) &&
  !resultsAssert.rateLimited;

const results = {
  ok,
  boundary: ok ? 'pass' : fixtureDiscovery.found ? 'results_screen' : 'completed_list_traversal',
  apiSession,
  sessionUi: { via: sessionUi.via },
  quizTitle,
  fixture: FIXTURE,
  list: {
    completedTabTotal,
    dataState,
    fixtureDiscovery,
    traversalSummary: {
      loadMoreTaps: traversal.loadMoreActions?.length ?? 0,
      loadMoreStalled: traversal.loadMoreStalled ?? false,
      titlesSeenCount: traversal.titlesSeen?.length ?? 0,
    },
  },
  viewTap: viewTap
    ? {
        tapped: viewTap.tapped,
        via: viewTap.via,
        reason: viewTap.reason,
        attempts: viewTap.attempts,
        bounds: viewTap.bounds,
      }
    : viewTap,
  resultsAssert,
  inlineOk,
  implementationApkSha256:
    process.env.ENGINEERING_EXPECTED_APK_SHA256 ||
    '00093298cb95c66d1cc15f8ec465d2218bebb33ac4a1305718776e6b551760f1',
  evidenceDir,
};

writeFileSync(join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ ok, boundary: results.boundary, evidenceDir }));
process.exit(ok ? 0 : 1);
