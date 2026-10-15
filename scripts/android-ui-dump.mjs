import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseUiTexts } from './lib/android-ui-parse.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence');
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';
const name = process.argv[2] || 'ui-now.xml';
mkdirSync(evidence, { recursive: true });
const local = join(evidence, name);
execSync(`adb -s ${serial} shell uiautomator dump /sdcard/ui.xml`, { stdio: 'ignore' });
execSync(`adb -s ${serial} pull /sdcard/ui.xml "${local.replace(/\\/g, '/')}"`, { stdio: 'ignore' });
const texts = parseUiTexts(local);
console.log(JSON.stringify({ file: name, texts: texts.slice(0, 40) }, null, 2));
