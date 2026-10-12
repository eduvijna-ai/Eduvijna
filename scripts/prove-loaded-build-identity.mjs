#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENGINEERING_EXPO_WEB_URL,
  ENGINEERING_METRO_PORT,
  engineeringImplementationSha,
  extractLoadedBuildShaFromBundleText,
} from './lib/engineering-runtime-target.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const intendedSha = engineeringImplementationSha();
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';

async function fetchBundle() {
  const url = `${ENGINEERING_EXPO_WEB_URL}/index.bundle?platform=android&dev=true&minify=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`bundle_http_${res.status}`);
  return await res.text();
}

async function waitForBundle(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fetchBundle();
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('bundle_unreachable');
}

function reloadAndroid() {
  try {
    execSync(`adb -s ${serial} reverse tcp:${ENGINEERING_METRO_PORT} tcp:${ENGINEERING_METRO_PORT}`, {
      stdio: 'ignore',
    });
    execSync(
      `adb -s ${serial} shell am broadcast -a com.eduvijna.RELOAD_RN 2>nul || adb -s ${serial} shell input keyevent 82`,
      { stdio: 'ignore', shell: true },
    );
    execSync(`adb -s ${serial} shell input text "RR"`, { stdio: 'ignore' });
  } catch {
    /* best effort */
  }
}

async function main() {
  const text = await waitForBundle();
  let loadedSha = extractLoadedBuildShaFromBundleText(text);
  if (!loadedSha && intendedSha) {
    loadedSha = text.includes(intendedSha) ? intendedSha : null;
  }
  const pass = loadedSha === intendedSha;
  const record = {
    provedAt: new Date().toISOString(),
    intendedImplementationSha: intendedSha,
    loadedImplementationSha: loadedSha,
    exactMatch: pass,
    metroUrl: ENGINEERING_EXPO_WEB_URL,
    bundleBytes: text.length,
  };
  const outDir = join(repoRoot, 'docs', 'evidence');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'loaded-build-identity.json'), JSON.stringify(record, null, 2));
  console.log(JSON.stringify(record));
  if (!pass) {
    reloadAndroid();
    process.exit(2);
  }
  reloadAndroid();
  process.exit(0);
}

main().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
