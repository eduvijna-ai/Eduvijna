#!/usr/bin/env node
/**
 * Provision / refresh EduVijna iOS Firebase client configuration.
 *
 * Uses Firebase CLI against project eduvijna-push.
 * Does NOT create a new Firebase project.
 * Does NOT touch Android apps.
 * Does NOT upload or inspect APNs .p8 private keys.
 *
 * Usage (after Firebase CLI / MCP authentication):
 *   node scripts/provision-ios-firebase-app.mjs
 *
 * Optional:
 *   EDUVIJNA_IOS_FIREBASE_APP_ID=1:416066207556:ios:... node scripts/provision-ios-firebase-app.mjs
 *   EDUVIJNA_FORCE_IOS_PLIST_OVERWRITE=1  # replace an already-valid local plist
 */

import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ID = 'eduvijna-push';
const PROJECT_NUMBER = '416066207556';
const BUNDLE_ID = 'com.eduvijna.app';
const OUT_FILE = resolve(process.cwd(), 'GoogleService-Info.plist');
const FIREBASE = 'npx -y firebase-tools@latest';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function parseAppsJson(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed?.result ?? parsed;
  } catch {
    throw new Error('Unable to parse Firebase apps:list JSON. Are you logged in?');
  }
}

function plistValue(contents, key) {
  const match = contents.match(new RegExp(`<key>${key}<\\/key>\\s*<string>([^<]*)<\\/string>`, 'm'));
  return match?.[1]?.trim() || null;
}

function summarizePlist(path) {
  const contents = readFileSync(path, 'utf8');
  return {
    projectId: plistValue(contents, 'PROJECT_ID'),
    senderId: plistValue(contents, 'GCM_SENDER_ID'),
    bundleId: plistValue(contents, 'BUNDLE_ID'),
    googleAppId: plistValue(contents, 'GOOGLE_APP_ID'),
    isPlaceholder: contents.includes('REPLACE_WITH_YOUR_'),
  };
}

function isApprovedMetadata(meta) {
  return (
    !meta.isPlaceholder
    && meta.projectId === PROJECT_ID
    && meta.senderId === PROJECT_NUMBER
    && meta.bundleId === BUNDLE_ID
    && typeof meta.googleAppId === 'string'
    && meta.googleAppId.startsWith(`1:${PROJECT_NUMBER}:ios:`)
  );
}

function main() {
  console.log(`Using Firebase project ${PROJECT_ID}; target bundle ${BUNDLE_ID}`);

  if (existsSync(OUT_FILE)) {
    const existing = summarizePlist(OUT_FILE);
    if (isApprovedMetadata(existing) && process.env.EDUVIJNA_FORCE_IOS_PLIST_OVERWRITE !== '1') {
      console.log('Approved GoogleService-Info.plist already present — leaving unchanged.');
      console.log(JSON.stringify({
        path: OUT_FILE,
        reused: true,
        projectId: existing.projectId,
        senderId: existing.senderId,
        bundleId: existing.bundleId,
        googleAppId: existing.googleAppId,
      }, null, 2));
      return;
    }
    if (!existing.isPlaceholder) {
      const backup = `${OUT_FILE}.bak-${Date.now()}`;
      copyFileSync(OUT_FILE, backup);
      console.log(`Backed up existing non-placeholder plist before refresh (${backup}).`);
    }
  }

  run(`${FIREBASE} use ${PROJECT_ID}`);

  const listRaw = run(`${FIREBASE} apps:list --project ${PROJECT_ID} --json`);
  const apps = parseAppsJson(listRaw);
  const iosApps = (Array.isArray(apps) ? apps : []).filter(
    (app) => String(app?.platform || '').toUpperCase() === 'IOS',
  );
  const existing = iosApps.find((app) => app?.bundleId === BUNDLE_ID || app?.bundle_id === BUNDLE_ID);

  let appId = process.env.EDUVIJNA_IOS_FIREBASE_APP_ID?.trim() || existing?.appId || existing?.name;
  if (!appId) {
    console.log('No iOS app for com.eduvijna.app found — creating one (no duplicate if race).');
    // Correct CLI shape: apps:create <platform> [displayName] --bundle-id <id>
    // Do NOT pass the bundle id as the positional displayName argument.
    const createdRaw = run(
      `${FIREBASE} apps:create IOS "EduVijna iOS" --bundle-id ${BUNDLE_ID} --project ${PROJECT_ID} --non-interactive --json`,
    );
    const created = parseAppsJson(createdRaw);
    appId = created?.appId || created?.app?.appId;
  } else {
    console.log('Reusing existing Firebase iOS app registration (no duplicate create).');
  }

  if (!appId) {
    throw new Error('Unable to resolve Firebase iOS app id for com.eduvijna.app');
  }

  // Redact full config: write file, print metadata only.
  const config = run(`${FIREBASE} apps:sdkconfig IOS ${appId} --project ${PROJECT_ID}`);
  const plistStart = config.indexOf('<?xml');
  if (plistStart < 0) {
    throw new Error('Firebase sdkconfig did not return a plist document');
  }
  writeFileSync(OUT_FILE, config.slice(plistStart), 'utf8');

  const meta = summarizePlist(OUT_FILE);
  console.log('GoogleService-Info.plist ready (contents not printed).');
  console.log(JSON.stringify({
    path: OUT_FILE,
    exists: existsSync(OUT_FILE),
    projectId: meta.projectId,
    senderId: meta.senderId,
    bundleId: meta.bundleId,
    googleAppId: meta.googleAppId,
    isPlaceholder: meta.isPlaceholder,
  }, null, 2));

  if (!isApprovedMetadata(meta)) {
    process.exitCode = 1;
    console.error('Plist metadata validation failed.');
  }
}

try {
  main();
} catch (error) {
  console.error(error?.message || String(error));
  process.exitCode = 1;
}
