/**
 * Deployed-web same-image handwritten OCR probe.
 * Uploads one JPEG to (1) mobile/dev-api origin and (2) deployed-web same-origin /api/v1 proxy.
 * Does not claim a shared Mathpix-only blocker unless both paths show the same gate.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, '.stack-validation-logs', 'review-api-probes-20261018');
mkdirSync(outDir, { recursive: true });

const WEB_ORIGIN = process.env.EDUVIJNA_WEB_ORIGIN || 'https://dev.eduvijna.com';
const IMAGE_PATH =
  process.env.HANDWRITTEN_PROBE_IMAGE ||
  join(repoRoot, '.stack-validation-logs', 'founder-manual-assets', 'edge-markers-portrait.jpg');

function summarizeOcr(status, body) {
  const detail =
    typeof body?.detail === 'string'
      ? body.detail.slice(0, 240)
      : body?.message
        ? String(body.message).slice(0, 240)
        : null;
  return {
    status,
    detail,
    success: Boolean(body?.success),
    mathpixGate:
      status === 503 && String(detail || '').toLowerCase().includes('mathpix'),
  };
}

async function postOcr({ label, url, token, bytes, filename }) {
  const form = new FormData();
  form.append('files', new Blob([bytes], { type: 'image/jpeg' }), filename);
  const started = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = { _parse: 'non_json' };
  }
  return {
    label,
    method: 'POST',
    url,
    filename,
    mimeType: 'image/jpeg',
    elapsedMs: Date.now() - started,
    ...summarizeOcr(res.status, body),
  };
}

async function loginWebProxy(username, password) {
  const res = await fetch(`${WEB_ORIGIN}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username_or_email: username, password }),
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  const token =
    body?.access_token ||
    body?.token ||
    body?.result?.access_token ||
    body?.data?.access_token ||
    null;
  return { status: res.status, token, detail: body?.detail || body?.message || null };
}

async function main() {
  if (!existsSync(IMAGE_PATH)) {
    throw new Error(`image_missing:${IMAGE_PATH}`);
  }
  const credPath = resolveDevApiCredentialsPath(repoRoot);
  const cfg = JSON.parse(readFileSync(credPath, 'utf8'));
  const bytes = readFileSync(IMAGE_PATH);
  const filename = 'edge-markers-portrait.jpg';
  const mobileBase = getDevApiBase();

  const instructor = await loginDevApi(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );

  const mobileStep = await postOcr({
    label: 'mobile_dev_api',
    url: `${mobileBase}/api/v1/batch-ocr-upload`,
    token: instructor.token,
    bytes,
    filename,
  });

  const webLogin = await loginWebProxy(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );
  let webStep = {
    label: 'deployed_web_same_origin',
    method: 'POST',
    url: `${WEB_ORIGIN}/api/v1/batch-ocr-upload`,
    filename,
    mimeType: 'image/jpeg',
    loginStatus: webLogin.status,
    loginOk: Boolean(webLogin.token),
    status: null,
    detail: webLogin.token ? null : webLogin.detail || 'web_login_failed',
    success: false,
    mathpixGate: false,
    elapsedMs: 0,
  };
  if (webLogin.token) {
    webStep = {
      ...webStep,
      ...(await postOcr({
        label: 'deployed_web_same_origin',
        url: `${WEB_ORIGIN}/api/v1/batch-ocr-upload`,
        token: webLogin.token,
        bytes,
        filename,
      })),
      loginStatus: webLogin.status,
      loginOk: true,
    };
  }

  const bothMathpix = mobileStep.mathpixGate && webStep.mathpixGate;
  const bothOk = mobileStep.success && webStep.success;
  let conclusion;
  if (!webStep.loginOk) {
    conclusion =
      `WEB_ACTION_UNVERIFIED: deployed-web login via ${WEB_ORIGIN}/api/v1 failed ` +
      `(loginStatus=${webStep.loginStatus}). Mobile OCR status=${mobileStep.status}` +
      `${mobileStep.mathpixGate ? ' (Mathpix gate on mobile/dev-api only — do not prescribe as shared web-only fix yet).' : '.'}`;
  } else if (bothMathpix) {
    conclusion =
      'SHARED_MATHPIX_GATE: same image → 503 Mathpix on both mobile/dev-api and deployed-web /api/v1. ' +
      'Generation remains blocked until provider is enabled on the shared backend behind these origins. ' +
      'Do not mark handwritten generation fixed until a real generated quiz succeeds.';
  } else if (mobileStep.mathpixGate && !webStep.mathpixGate) {
    conclusion =
      `NOT_SHARED_MATHPIX_ONLY: mobile/dev-api Mathpix 503 but deployed-web status=${webStep.status} ` +
      `(detail=${webStep.detail || 'n/a'}). Investigate origin/proxy/config differences before prescribing Mathpix enablement as the only fix.`;
  } else if (bothOk) {
    conclusion =
      'OCR_OK on mobile and deployed-web for same image — investigate generate-strict / payload if generation still fails. Generation not marked fixed.';
  } else {
    conclusion =
      `DIVERGENT_OR_OTHER_FAILURE: mobile status=${mobileStep.status} web status=${webStep.status}. ` +
      'Do not claim a single shared Mathpix-only solution from this evidence alone.';
  }

  const evidence = {
    webOrigin: WEB_ORIGIN,
    mobileApiBase: mobileBase,
    imagePath: IMAGE_PATH.replace(/\\/g, '/'),
    imageBytes: bytes.length,
    role: 'instructor',
    steps: [mobileStep, webStep],
    conclusion,
    generationFixed: false,
  };

  const outPath = join(outDir, 'handwritten-web-same-image-live.json');
  writeFileSync(outPath, JSON.stringify(evidence, null, 2));

  // Keep parity file accurate: only claim shared backend when both paths match.
  const parityPath = join(outDir, 'handwritten-ocr-parity-live.json');
  writeFileSync(
    parityPath,
    JSON.stringify(
      {
        apiBase: mobileBase,
        webOrigin: WEB_ORIGIN,
        role: 'instructor',
        steps: evidence.steps,
        conclusion,
        generationFixed: false,
        evidencePath: outPath.replace(/\\/g, '/'),
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify({
      outPath,
      parityPath,
      conclusion,
      mobileStatus: mobileStep.status,
      webStatus: webStep.status,
      webLoginOk: webStep.loginOk,
    }),
  );
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
