/**
 * Automated Document / Handwritten module authorization proof (ADB UI).
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adbUiDump } from './lib/adb-ui-dump.mjs';
import {
  isEduvijnaAppForeground,
  locateByLabel,
  locateByTestId,
  locateByContentDesc,
  parseUiXml,
  readXmlContent,
  collectUiTexts,
} from './lib/android-journey-logic.mjs';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import {
  engineeringImplementationSha,
  buildEngineeringRunRecord,
} from './lib/engineering-runtime-target.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence', 'nav-module-access');
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';
const sha = engineeringImplementationSha();

mkdirSync(evidence, { recursive: true });

function adb(cmd) {
  execSync(`adb -s ${serial} ${cmd}`, { stdio: 'ignore' });
}
function sleep(ms) {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' });
}
function dump(name) {
  const local = join(evidence, name);
  adbUiDump(serial, local);
  return local;
}

function tapTarget(target) {
  if (!target) return null;
  adb(`shell input tap ${target.x} ${target.y}`);
  return target;
}

function scrollDown() {
  adb('shell input swipe 540 1500 540 700 350');
  sleep(700);
}
function scrollUp() {
  adb('shell input swipe 540 700 540 1500 350');
  sleep(700);
}

function shellReady(xml) {
  if (!isEduvijnaAppForeground(xml)) return false;
  const nodes = parseUiXml(xml);
  return (
    locateByLabel(nodes, 'Home', { minY: 0, pick: 'bottom' }) != null ||
    locateByLabel(nodes, 'Assessments', { minY: 0, pick: 'bottom' }) != null
  );
}

function waitFor(predicate, { attempts = 12, pauseMs = 1000, dumpName = 'wait' } = {}) {
  for (let i = 0; i < attempts; i++) {
    const path = dump(`${dumpName}-${i}.xml`);
    const xml = readXmlContent(path);
    if (predicate(xml, path)) return { ok: true, xmlPath: path, xml };
    sleep(pauseMs);
  }
  return { ok: false, xmlPath: null, xml: null };
}

function denyMarkers(xml) {
  const texts = collectUiTexts(parseUiXml(xml));
  const blob = texts.join(' ');
  return {
    notAvailable: /Not available/i.test(blob),
    moduleDisabled: /assessment module is not enabled/i.test(blob),
    loginForm: locateByTestId(parseUiXml(xml), 'login-email-input') != null,
  };
}

function verifyDocumentDestination(xml) {
  const nodes = parseUiXml(xml);
  const texts = collectUiTexts(nodes);
  const blob = texts.join(' ');
  const deny = denyMarkers(xml);
  const uploadHome =
    /Upload/i.test(blob) &&
    (locateByLabel(nodes, /From Books/i, { minY: 0 }) != null ||
      locateByLabel(nodes, /Document/i, { minY: 0 }) != null ||
      texts.some((t) => /upload/i.test(t)));
  const workspaceDoc =
    locateByLabel(nodes, /Document Assessment/i, { minY: 0 }) != null ||
    texts.some((t) => /Upload File|From Books|Document flow/i.test(t));
  return {
    pass: !deny.notAvailable && !deny.moduleDisabled && !deny.loginForm && (uploadHome || workspaceDoc),
    destination: uploadHome ? 'DocumentUploadHomeScreen' : workspaceDoc ? 'AssessmentWorkspaceScreen' : 'unknown',
    workspaceMode: workspaceDoc ? 'document' : uploadHome ? 'document' : null,
    deny,
    sample: texts.slice(0, 25),
  };
}

function verifyHandwrittenDestination(xml) {
  const nodes = parseUiXml(xml);
  const texts = collectUiTexts(nodes);
  const blob = texts.join(' ');
  const deny = denyMarkers(xml);
  const handwrittenWorkspace =
    locateByLabel(nodes, /Handwritten/i, { minY: 0 }) != null &&
    (blob.includes('OCR') ||
      blob.includes('handwritten') ||
      blob.includes('Capture or pick handwritten'));
  const createScreen = texts.some((t) => /Handwritten/i.test(t)) && blob.includes('Generate');
  return {
    pass:
      !deny.notAvailable &&
      !deny.moduleDisabled &&
      !deny.loginForm &&
      (handwrittenWorkspace || createScreen),
    destination: handwrittenWorkspace ? 'AssessmentWorkspaceScreen' : createScreen ? 'CreateHandwrittenQuizScreen' : 'unknown',
    workspaceMode: handwrittenWorkspace ? 'handwritten' : null,
    deny,
    sample: texts.slice(0, 25),
  };
}

async function loadNavRows() {
  const credFile = join(repoRoot, '.dev-api-credentials.local.json');
  if (!existsSync(credFile)) throw new Error('missing_credentials');
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const instructor = await loginDevApi(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );
  const q = new URLSearchParams({
    is_active: 'true',
    roles: 'instructor,teacher',
    _sort: 'display_order',
    _order: 'asc',
  });
  const res = await fetch(`${getDevApiBase()}/api/v1/quiz-navigation-items?${q}`, {
    headers: { Authorization: `Bearer ${instructor.token}` },
  });
  const body = await res.json();
  const rows = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.items)
        ? body.items
        : [];
  const doc = rows.find((r) => Number(r.id) === 178);
  const hw = rows.find((r) => Number(r.id) === 169);
  return {
    role: instructor.role ?? 'instructor',
    documentRow: doc
      ? {
          id: doc.id,
          route_path: doc.route_path,
          component_name: doc.component_name,
          label: doc.label,
          capability: 'document',
        }
      : null,
    handwrittenRow: hw
      ? {
          id: hw.id,
          route_path: hw.route_path,
          component_name: hw.component_name,
          label: hw.label,
          capability: 'handwritten',
        }
      : null,
  };
}

function ensureInApp() {
  spawnSync('node', [join(repoRoot, 'scripts/android-dismiss-overlays.mjs')], {
    stdio: 'ignore',
    env: { ...process.env, ANDROID_SERIAL: serial },
  });
  let ready = waitFor(shellReady, { dumpName: 'nav-shell', attempts: 6, pauseMs: 900 });
  if (!ready.ok) {
    spawnSync('node', [join(repoRoot, 'scripts/android-bootstrap-dev-client.mjs'), 'instructor'], {
      stdio: 'inherit',
      env: { ...process.env, ANDROID_SERIAL: serial },
    });
    spawnSync('node', [join(repoRoot, 'scripts/android-dismiss-overlays.mjs')], {
      stdio: 'ignore',
      env: { ...process.env, ANDROID_SERIAL: serial },
    });
    ready = waitFor(shellReady, { dumpName: 'nav-shell-after-bootstrap', attempts: 18, pauseMs: 1500 });
  }
  if (!ready.ok) throw new Error('eduvijna_shell_not_ready');
  const homeTab = locateByLabel(parseUiXml(ready.xml), 'Home', { minY: 0, pick: 'bottom' });
  if (homeTab) {
    tapTarget(homeTab);
    sleep(1800);
  }
}

function goHomeAndFindTile(tileLabels) {
  const labels = Array.isArray(tileLabels) ? tileLabels : [tileLabels];
  let hit = null;
  let path = null;
  for (let s = 0; s < 3; s++) scrollUp();
  for (let s = 0; s < 18; s++) {
    path = dump(`home-scroll-${s}.xml`);
    const nodes = parseUiXml(readXmlContent(path));
    for (const tileLabel of labels) {
      hit =
        locateByContentDesc(nodes, new RegExp(`, ${tileLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'), {
          requireClickable: true,
        }) ||
        locateByLabel(nodes, new RegExp(`^${tileLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), {
          minY: 0,
        }) ||
        locateByLabel(nodes, tileLabel, { minY: 0 });
      if (hit) break;
    }
    if (hit) break;
    scrollDown();
  }
  return { hit, path, labels };
}

function openCreateAssessmentModal() {
  const path = dump('header-before-modal.xml');
  const nodes = parseUiXml(readXmlContent(path));
  const headerButtons = nodes
    .filter(
      (n) =>
        n.clickable === 'true' &&
        n.boundsRect &&
        n.boundsRect.y2 < 260 &&
        n.boundsRect.x1 > 700,
    )
    .sort((a, b) => a.boundsRect.x1 - b.boundsRect.x1);
  const addCandidate = headerButtons[0];
  if (addCandidate) {
    tapTarget({
      x: addCandidate.boundsRect.cx,
      y: addCandidate.boundsRect.cy,
    });
  } else {
    adb('shell input tap 1000 140');
  }
  sleep(1200);
  return waitFor((xml) => locateByLabel(parseUiXml(xml), /Create Assessment/i, { minY: 0 }) != null, {
    dumpName: 'create-modal',
    attempts: 6,
    pauseMs: 800,
  });
}

function findTileInModal(tileLabels) {
  const labels = Array.isArray(tileLabels) ? tileLabels : [tileLabels];
  const path = dump('create-modal-options.xml');
  const nodes = parseUiXml(readXmlContent(path));
  for (const tileLabel of labels) {
    const hit =
      locateByLabel(nodes, new RegExp(tileLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), {
        minY: 0,
      }) || locateByContentDesc(nodes, tileLabel, { requireClickable: true });
    if (hit) return hit;
  }
  return null;
}

async function proveModule({ tileLabels, verifyFn, navMeta }) {
  const log = { tileLabels, navMeta, steps: [] };
  ensureInApp();
  const found = goHomeAndFindTile(tileLabels);
  log.steps.push({ step: 'locate_tile', labels: found.labels, hit: Boolean(found.hit) });
  if (!found.hit) {
    return { ...log, pass: false, reason: 'tile_not_found' };
  }
  tapTarget(found.hit);
  sleep(4500);
  const destPath = dump(`dest-${String(tileLabels[0]).replace(/\s+/g, '-')}.xml`);
  const verify = verifyFn(readXmlContent(destPath));
  log.verify = verify;
  log.pass = verify.pass;
  adb('shell input keyevent 4');
  sleep(1500);
  return log;
}

async function main() {
  const runRecord = await buildEngineeringRunRecord({ accountRole: 'instructor' });
  if (runRecord.bundleProbe.loadedBuildSha !== sha) {
    console.error(JSON.stringify({ error: 'bundle_sha_mismatch', sha, runRecord }));
    process.exit(2);
  }
  const nav = await loadNavRows();
  const docLabels = [nav.documentRow?.label || 'Document', 'Document Quiz', 'Document Upload'];
  const hwLabels = ['Handwritten', 'Notes/Paper'];

  const document = await proveModule({
    tileLabels: docLabels,
    navMeta: nav.documentRow,
    verifyFn: verifyDocumentDestination,
  });
  const handwritten = await (async () => {
    const log = { tileLabels: hwLabels, navMeta: nav.handwrittenRow, steps: [] };
    ensureInApp();
    let hit = goHomeAndFindTile(hwLabels).hit;
    let via = hit ? 'generate_grid' : null;
    if (!hit) {
      log.steps.push({ step: 'grid_tile_miss_try_header_modal' });
      const modal = openCreateAssessmentModal();
      log.steps.push({ step: 'open_create_modal', ok: modal.ok });
      if (modal.ok) {
        hit = findTileInModal(hwLabels);
        via = hit ? 'create_assessment_modal' : null;
      }
    } else {
      log.steps.push({ step: 'locate_tile_grid', hit: true });
    }
    if (!hit) {
      return { ...log, pass: false, reason: 'tile_not_found' };
    }
    log.steps.push({ step: 'open_handwritten_entry', via, hit: true });
    tapTarget(hit);
    sleep(4500);
    const destPath = dump('dest-Handwritten.xml');
    const verify = verifyHandwrittenDestination(readXmlContent(destPath));
    log.verify = verify;
    log.pass = verify.pass;
    adb('shell input keyevent 4');
    sleep(1200);
    return log;
  })();

  const report = {
    implementationSha: sha,
    role: nav.role,
    AUTHORIZED_DOCUMENT_ACCESS: document.pass ? 'PASS' : 'FAIL',
    AUTHORIZED_HANDWRITTEN_ACCESS: handwritten.pass ? 'PASS' : 'FAIL',
    document,
    handwritten,
    crossCapabilityNote:
      'Separate tile opens verified independently; capability isolation covered by unit tests quizNavAccessCapability.test.ts',
    runAt: runRecord.runAt,
  };
  writeFileSync(join(evidence, 'nav-module-access-report.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      implementationSha: sha,
      AUTHORIZED_DOCUMENT_ACCESS: report.AUTHORIZED_DOCUMENT_ACCESS,
      AUTHORIZED_HANDWRITTEN_ACCESS: report.AUTHORIZED_HANDWRITTEN_ACCESS,
    }),
  );
  if (!document.pass || !handwritten.pass) process.exit(1);
}

main().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
