import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

function sleep(ms) {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' });
}

function hierarchyLooksValid(xml) {
  return (
    xml.includes('<hierarchy') &&
    xml.includes('</hierarchy>') &&
    /<node\s/.test(xml) &&
    !/ERROR:\s*null root node/i.test(xml)
  );
}

/**
 * Dump the Android UI hierarchy with retries (UiAutomator can transiently fail).
 * @param {string} serial
 * @param {string} localPath absolute path to write XML
 */
export function adbUiDump(serial, localPath, { retries = 8, pauseMs = 700 } = {}) {
  mkdirSync(dirname(localPath), { recursive: true });
  const remote = '/sdcard/ui.xml';
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      execSync(`adb -s ${serial} shell uiautomator dump ${remote}`, { stdio: 'pipe' });
      execSync(`adb -s ${serial} pull ${remote} "${localPath.replace(/\\/g, '/')}"`, {
        stdio: 'pipe',
      });
      const xml = readFileSync(localPath, 'utf8');
      if (hierarchyLooksValid(xml)) return localPath;
    } catch {
      /* retry */
    }
    sleep(pauseMs);
  }
  return localPath;
}
