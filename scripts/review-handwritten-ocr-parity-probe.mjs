/**
 * Compare handwritten OCR + generate-strict against dev-api with the same
 * instructor account used by mobile. Redacts tokens. Does not embed secrets.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, '.stack-validation-logs', 'review-api-probes-20261018');
mkdirSync(outDir, { recursive: true });

/** Minimal JPEG (1x1) — exercises Mathpix gate before real OCR content. */
function tinyJpegBytes() {
  const b64 =
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z';
  return Buffer.from(b64, 'base64');
}

async function main() {
  const credPath = resolveDevApiCredentialsPath(repoRoot);
  if (!existsSync(credPath)) {
    throw new Error(`credentials_missing:${credPath}`);
  }
  const cfg = JSON.parse(readFileSync(credPath, 'utf8'));
  const base = getDevApiBase();
  const instructor = await loginDevApi(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );

  const form = new FormData();
  form.append(
    'files',
    new Blob([tinyJpegBytes()], { type: 'image/jpeg' }),
    'hw_parity_probe.jpg',
  );

  const ocrStarted = Date.now();
  const ocrRes = await fetch(`${base}/api/v1/batch-ocr-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${instructor.token}` },
    body: form,
  });
  let ocrBody;
  try {
    ocrBody = await ocrRes.json();
  } catch {
    ocrBody = { _parse: 'non_json' };
  }

  const evidence = {
    apiBase: base,
    role: 'instructor',
    steps: [
      {
        name: 'batch-ocr-upload',
        method: 'POST',
        path: '/api/v1/batch-ocr-upload',
        multipartField: 'files',
        filename: 'hw_parity_probe.jpg',
        mimeType: 'image/jpeg',
        status: ocrRes.status,
        elapsedMs: Date.now() - ocrStarted,
        detail:
          typeof ocrBody?.detail === 'string'
            ? ocrBody.detail.slice(0, 240)
            : ocrBody?.message || null,
        success: Boolean(ocrBody?.success),
        mathpixGate:
          ocrRes.status === 503 &&
          String(ocrBody?.detail || '').toLowerCase().includes('mathpix'),
      },
    ],
    conclusion: null,
  };

  if (evidence.steps[0].mathpixGate) {
    evidence.conclusion =
      'SHARED_BACKEND_BLOCKER: Mathpix OCR not enabled/configured on this API origin. ' +
      'Mobile and web handwritten both call the same endpoint; generation cannot succeed until provider is enabled server-side.';
  } else if (ocrRes.status >= 200 && ocrRes.status < 300 && ocrBody?.success) {
    evidence.conclusion =
      'OCR_OK on shared origin — investigate generate-strict / payload differences if mobile still fails.';
  } else {
    evidence.conclusion = `OCR_FAILED status=${ocrRes.status} (not a Mathpix gate string). Compare with web Network tab on same origin.`;
  }

  const outPath = join(outDir, 'handwritten-ocr-parity-live.json');
  writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ outPath, conclusion: evidence.conclusion, status: ocrRes.status }));
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
