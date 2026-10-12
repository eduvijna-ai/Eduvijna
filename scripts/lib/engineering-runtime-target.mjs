/**
 * Single engineering runtime target for PR #26 acceptance (do not alternate ports casually).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ENGINEERING_METRO_PORT = 8082;
export const ENGINEERING_EXPO_WEB_URL = `http://localhost:${ENGINEERING_METRO_PORT}`;
export const ENGINEERING_REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

export function engineeringImplementationSha() {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: ENGINEERING_REPO_ROOT,
    encoding: 'utf8',
  });
  return (r.stdout || '').trim();
}

export const ENGINEERING_BUNDLE_MARKER = 'curriculum-generated-preview-v1';

/** Fetches the dev bundle from the engineering Metro port and checks for the marker string. */
export async function probeEngineeringBundleMarker() {
  const url = `${ENGINEERING_EXPO_WEB_URL}/index.bundle?platform=android&dev=true&minify=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { pass: false, error: `bundle_http_${res.status}`, markerFound: false, metroUrl: url };
    }
    const text = await res.text();
    const markerFound = text.includes(ENGINEERING_BUNDLE_MARKER);
    return {
      pass: markerFound,
      markerFound,
      metroUrl: url,
      gitHeadSha: engineeringImplementationSha(),
      bundleBytes: text.length,
      error: markerFound ? null : 'marker_missing_in_bundle',
    };
  } catch (e) {
    return {
      pass: false,
      markerFound: false,
      metroUrl: url,
      gitHeadSha: engineeringImplementationSha(),
      error: e?.message || String(e),
    };
  }
}
