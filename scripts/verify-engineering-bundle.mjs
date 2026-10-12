#!/usr/bin/env node
/**
 * Proves the Metro bundle served on the engineering port contains the expected build marker.
 * Git HEAD alone does not prove the device loaded that bundle.
 */
import { ENGINEERING_EXPO_WEB_URL, engineeringImplementationSha } from './lib/engineering-runtime-target.mjs';

const MARKER = 'curriculum-generated-preview-v1';

async function fetchBundleText() {
  const indexRes = await fetch(`${ENGINEERING_EXPO_WEB_URL}/index.bundle?platform=android&dev=true&minify=false`);
  if (!indexRes.ok) {
    throw new Error(`bundle_fetch_failed:${indexRes.status}`);
  }
  return await indexRes.text();
}

async function main() {
  const gitSha = engineeringImplementationSha();
  let bundleSha = null;
  let markerFound = false;
  let error = null;
  try {
    const text = await fetchBundleText();
    markerFound = text.includes(MARKER);
    const m = text.match(/engineeringImplementationSha['"]?\s*[:=]\s*['"]([a-f0-9]{7,40})/i);
    if (m) bundleSha = m[1];
  } catch (e) {
    error = e?.message || String(e);
  }

  const report = {
    metroUrl: ENGINEERING_EXPO_WEB_URL,
    gitHeadSha: gitSha,
    expectedMarker: MARKER,
    markerFoundInBundle: markerFound,
    bundleShaHint: bundleSha,
    error,
    pass: markerFound && !error,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main();
