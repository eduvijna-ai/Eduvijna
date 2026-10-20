/**
 * Expo web UI journeys via Puppeteer (credentials from local file; never logged).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { ENGINEERING_EXPO_WEB_URL } from './lib/engineering-runtime-target.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence', 'web');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');

const baseUrl = process.env.EXPO_WEB_URL || ENGINEERING_EXPO_WEB_URL;

mkdirSync(evidence, { recursive: true });

function redactUrl(url) {
  try {
    const u = new URL(url);
    for (const key of ['token', 'password', 'access_token', 'refresh_token', 'session_id']) {
      if (u.searchParams.has(key)) u.searchParams.set(key, '[redacted]');
    }
    return u.toString();
  } catch {
    return String(url).replace(/(password|token|access_token|refresh_token)=[^&]+/gi, '$1=[redacted]');
  }
}

function redactText(text) {
  return String(text ?? '')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/("password"\s*:\s*")[^"]+"/gi, '$1[redacted]"')
    .slice(0, 4000);
}

function createDiagnostics() {
  return {
    boundaries: {
      htmlServed: false,
      bundleRequested: false,
      bundleStatus: null,
      bundleOk: false,
      jsExecuted: false,
      reactMounted: false,
      startupCompleted: false,
      loginRendered: false,
      authenticated: false,
    },
    pageErrors: [],
    consoleErrors: [],
    failedRequests: [],
    bundleResponses: [],
    authState: null,
  };
}

function attachPageDiagnostics(page, diag) {
  page.on('pageerror', (err) => {
    diag.pageErrors.push(redactText(err?.message || String(err)));
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      diag.consoleErrors.push(redactText(msg.text()));
    }
  });
  page.on('requestfailed', (req) => {
    diag.failedRequests.push({
      url: redactUrl(req.url()),
      method: req.method(),
      error: req.failure()?.errorText ?? 'unknown',
    });
  });
  page.on('response', async (res) => {
    const url = res.url();
    if (!/index\.bundle|\.bundle\?|platform=web/i.test(url)) return;
    const status = res.status();
    let errorType = null;
    if (status >= 400) {
      try {
        const body = await res.text();
        const parsed = JSON.parse(body);
        errorType = parsed?.type ?? parsed?.name ?? null;
        if (parsed?.message) {
          diag.consoleErrors.push(redactText(String(parsed.message).slice(0, 500)));
        }
      } catch {
        // ignore
      }
    }
    diag.bundleResponses.push({ url: redactUrl(url), status, errorType });
    diag.boundaries.bundleRequested = true;
    diag.boundaries.bundleStatus = status;
    diag.boundaries.bundleOk = status >= 200 && status < 400;
  });
}

async function evaluateStartupState(page) {
  return page.evaluate(() => {
    const root = document.getElementById('root');
    const rootChildCount = root?.childElementCount ?? 0;
    const bodyText = document.body?.innerText?.slice(0, 800) ?? '';
    const loginSubmit = document.querySelector('[data-testid="login-submit-button"]');
    const loginEmail = document.querySelector('[data-testid="login-email-input"]');
    const hasSpinnerOnly =
      rootChildCount > 0 &&
      !loginSubmit &&
      !bodyText.includes('Assessments') &&
      !bodyText.includes('Sign in');
    return {
      rootChildCount,
      hasLoginSubmit: Boolean(loginSubmit),
      hasLoginEmail: Boolean(loginEmail),
      hasAssessments: bodyText.includes('Assessments'),
      hasHome: bodyText.includes('Home') || bodyText.includes('Dashboard'),
      hasSignIn: bodyText.includes('Sign in'),
      bodySample: bodyText.slice(0, 200),
      hasSpinnerOnly,
    };
  });
}

async function waitForStartupBoundary(page, diag, { timeoutMs = 120000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await evaluateStartupState(page);
    diag.authState = state;
    if (state.rootChildCount > 0) {
      diag.boundaries.reactMounted = true;
    }
    if (state.hasLoginSubmit || state.hasLoginEmail) {
      diag.boundaries.loginRendered = true;
      diag.boundaries.startupCompleted = true;
      return { kind: 'login', state };
    }
    if (state.hasAssessments || (state.hasHome && !state.hasSignIn)) {
      diag.boundaries.authenticated = true;
      diag.boundaries.startupCompleted = true;
      return { kind: 'authenticated', state };
    }
    if (!state.hasSpinnerOnly && state.rootChildCount > 0 && !state.hasSignIn) {
      diag.boundaries.jsExecuted = true;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return { kind: 'timeout', state: diag.authState };
}

async function saveFailureEvidence(page, diag, tag) {
  const prefix = join(evidence, tag);
  const url = page.url();
  let domSummary = null;
  try {
    domSummary = await page.evaluate(() => ({
      title: document.title,
      testIds: [...document.querySelectorAll('[data-testid]')]
        .map((el) => el.getAttribute('data-testid'))
        .slice(0, 40),
      placeholders: [...document.querySelectorAll('input')]
        .map((el) => el.getAttribute('placeholder'))
        .filter(Boolean)
        .slice(0, 10),
      bodyLength: document.body?.innerText?.length ?? 0,
    }));
  } catch {
    domSummary = { error: 'dom_summary_failed' };
  }
  try {
    await page.screenshot({ path: `${prefix}.png`, fullPage: true });
  } catch {
    // ignore
  }
  const payload = {
    at: new Date().toISOString(),
    url: redactUrl(url),
    boundaries: diag.boundaries,
    domSummary,
    pageErrors: diag.pageErrors.slice(-20),
    consoleErrors: diag.consoleErrors.slice(-20),
    failedRequests: diag.failedRequests.slice(-30),
    bundleResponses: diag.bundleResponses,
    authState: diag.authState,
  };
  writeFileSync(`${prefix}.json`, JSON.stringify(payload, null, 2));
  return payload;
}

function firstFailingBoundary(diag) {
  if (!diag.boundaries.htmlServed) return 'html_served';
  if (!diag.boundaries.bundleRequested) return 'js_bundle_fetch';
  if (!diag.boundaries.bundleOk) return 'js_bundle_http';
  if (!diag.boundaries.reactMounted) return 'react_mounted';
  if (!diag.boundaries.startupCompleted) return 'startup_auth_completed';
  if (!diag.boundaries.loginRendered && !diag.boundaries.authenticated) return 'login_rendered';
  return null;
}

async function waitForAuthenticatedApp(page, { timeoutMs = 120000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await evaluateStartupState(page);
    if (state.hasAssessments || (state.hasHome && !state.hasSignIn)) {
      return state;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('authenticated_app_timeout');
}

async function login(page, role, diag) {
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const account = cfg.accounts[role];
  const startup = await waitForStartupBoundary(page, diag);
  if (startup.kind === 'authenticated') {
    return { loggedIn: true, skippedLogin: true };
  }
  if (startup.kind !== 'login') {
    const boundary = firstFailingBoundary(diag) ?? 'startup_auth_completed';
    throw new Error(`startup_boundary_${boundary}`);
  }

  const emailSel = '[data-testid="login-email-input"]';
  const passSel = '[data-testid="login-password-input"]';
  const submitSel = '[data-testid="login-submit-button"]';

  await page.waitForSelector(emailSel, { timeout: 30000 });
  await page.click(emailSel, { clickCount: 3 });
  await page.type(emailSel, account.username, { delay: 12 });
  await page.type(passSel, account.password, { delay: 12 });
  await page.click(submitSel);

  await waitForAuthenticatedApp(page, { timeoutMs: 120000 });
  await page.screenshot({ path: join(evidence, `login-${role}.png`), fullPage: true });
  return { loggedIn: true, skippedLogin: false };
}

async function main() {
  const role = process.argv[2] || 'instructor';
  if (!existsSync(credFile)) process.exit(2);

  const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 1280, height: 900 } });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const diag = createDiagnostics();

  attachPageDiagnostics(page, diag);

  try {
    const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    diag.boundaries.htmlServed = Boolean(response && response.ok());
    diag.boundaries.bundleRequested = diag.bundleResponses.length > 0;

    const result = await login(page, role, diag);
    writeFileSync(
      join(evidence, `login-${role}-report.json`),
      JSON.stringify({ ok: true, role, ...result, boundaries: diag.boundaries }, null, 2),
    );
    console.log(JSON.stringify({ ok: true, role, evidence: `web/login-${role}.png` }));
  } catch (e) {
    const boundary = firstFailingBoundary(diag) ?? String(e.message || e);
    const payload = await saveFailureEvidence(page, diag, `login-${role}-failure`);
    writeFileSync(
      join(evidence, `login-${role}-report.json`),
      JSON.stringify({ ok: false, role, firstFailingBoundary: boundary, ...payload }, null, 2),
    );
    console.log(JSON.stringify({ ok: false, role, firstFailingBoundary: boundary }));
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

main();
