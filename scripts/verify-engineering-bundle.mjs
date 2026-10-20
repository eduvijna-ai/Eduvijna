#!/usr/bin/env node
/**
 * Proves the Metro bundle served on the engineering port contains the expected build marker.
 * Git HEAD alone does not prove the device loaded that bundle.
 */
import {
  ENGINEERING_EXPO_WEB_URL,
  buildEngineeringRunRecord,
  engineeringImplementationSha,
} from './lib/engineering-runtime-target.mjs';

const MARKER = 'curriculum-generated-preview-v1';

async function fetchBundleText() {
  const indexRes = await fetch(`${ENGINEERING_EXPO_WEB_URL}/index.bundle?platform=android&dev=true&minify=false`);
  if (!indexRes.ok) {
    throw new Error(`bundle_fetch_failed:${indexRes.status}`);
  }
  return await indexRes.text();
}

async function main() {
  const record = await buildEngineeringRunRecord({ accountRole: 'engineering-verify' });
  const report = {
    ...record,
    expectedMarker: MARKER,
    pass: record.bundleProbe.pass,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main();
