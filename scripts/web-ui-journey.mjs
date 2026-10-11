/**
 * Expo web UI journeys via Puppeteer (credentials from local file; never logged).
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence', 'web');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const baseUrl = process.env.EXPO_WEB_URL || 'http://localhost:8083';

mkdirSync(evidence, { recursive: true });

async function login(page, role) {
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const account = cfg.accounts[role];
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });
  await page.reload({ waitUntil: 'networkidle2', timeout: 180000 });
  const emailSel = '[data-testid="login-email-input"], input[placeholder="Email or Username"]';
  await page.waitForFunction(
    (sel) => document.querySelector(sel),
    { timeout: 180000 },
    emailSel,
  );
  await page.click(emailSel, { clickCount: 3 });
  await page.type(emailSel, account.username, { delay: 15 });
  const passSel = '[data-testid="login-password-input"], input[placeholder="Password"]';
  await page.type(passSel, account.password, { delay: 15 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }).catch(() => null),
    page.click('[data-testid="login-submit-button"], button, text=Sign in'),
  ]);
  await new Promise((r) => setTimeout(r, 5000));
  const url = page.url();
  const body = await page.evaluate(() => document.body.innerText.slice(0, 500));
  const loggedIn = !body.includes('Sign in') && (body.includes('Home') || body.includes('Assessments'));
  await page.screenshot({ path: join(evidence, `login-${role}.png`), fullPage: true });
  return { loggedIn, url, bodySample: body.slice(0, 120) };
}

async function main() {
  const role = process.argv[2] || 'instructor';
  if (!existsSync(credFile)) process.exit(2);
  const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 1280, height: 900 } });
  const page = await browser.newPage();
  page.on('requestfailed', (r) => {
    if (r.url().includes('/api/')) {
      console.error('request_failed', r.url().split('?')[0], r.failure()?.errorText);
    }
  });
  const result = await login(page, role);
  await browser.close();
  console.log(JSON.stringify({ ok: result.loggedIn, role, evidence: `web/login-${role}.png` }));
  process.exit(result.loggedIn ? 0 : 1);
}

main().catch(async (e) => {
  console.error(String(e.message || e));
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
    await page.screenshot({ path: join(evidence, 'login-failure.png'), fullPage: true });
    const snippet = await page.evaluate(() => document.body?.innerText?.slice(0, 400) ?? '');
    writeFileSync(join(evidence, 'login-failure.txt'), snippet);
    await browser.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
