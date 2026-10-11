/**
 * Founder acceptance journeys on Expo web (Puppeteer).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer';
import { FIXTURE, loadFixtureLabels } from './lib/founder-fixture.mjs';
import { loadFixtureTrace } from './lib/assessments-android-locate.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence', 'web-journeys');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const baseUrl = process.env.EXPO_WEB_URL || 'http://localhost:8083';
const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).stdout.trim();

mkdirSync(evidence, { recursive: true });

async function evaluateBody(page) {
  return page.evaluate(() => document.body?.innerText ?? '');
}

async function waitForAuthenticatedShell(page, { timeoutMs = 120000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await page.evaluate(() => {
      const body = document.body?.innerText ?? '';
      const hasLogin = Boolean(document.querySelector('[data-testid="login-submit-button"]'));
      const hasApp =
        /Assessments|Analytics|Dashboard|Demo School|Home/i.test(body) && !hasLogin;
      return { hasApp, hasLogin };
    });
    if (state.hasApp) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('authenticated_shell_timeout');
}

async function waitForText(page, pattern, { timeoutMs = 90000 } = {}) {
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const text = await evaluateBody(page);
    if (re.test(text)) return text;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`wait_for_text_timeout:${pattern}`);
}

async function loginInstructor(page) {
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const account = cfg.accounts.instructor;
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const submitSel = '[data-testid="login-submit-button"]';
  const emailSel = '[data-testid="login-email-input"]';
  const passSel = '[data-testid="login-password-input"]';
  const hasLogin = await page.$(submitSel);
  if (hasLogin) {
    await page.waitForSelector(emailSel, { timeout: 60000 });
    await page.click(emailSel, { clickCount: 3 });
    await page.type(emailSel, account.username, { delay: 10 });
    await page.type(passSel, account.password, { delay: 10 });
    await page.click(submitSel);
  }
  await waitForAuthenticatedShell(page);
}

function verifyWorksheetMetrics(text, labels) {
  const scoreOk = /\b60\s*%/.test(text) || /Score\s*:\s*60/i.test(text);
  const evaluatedOk = /(evaluated|items|questions).{0,16}\b10\b/i.test(text) || /\b10\b.{0,16}(evaluated|items)/i.test(text);
  const correctOk = /\b6\b\s*correct/i.test(text) || /Correct\s*:\s*6/i.test(text) || /6\s*\/\s*10/i.test(text);
  const studentOk = text.includes(FIXTURE.studentName);
  const titleOk = text.includes(labels.quizTitle) || /Results/i.test(text);
  return {
    pass: scoreOk && evaluatedOk && correctOk && studentOk && titleOk,
    scoreOk,
    evaluatedOk,
    correctOk,
    studentOk,
    titleOk,
  };
}

async function clickByTestId(page, testId) {
  const sel = `[data-testid="${testId}"]`;
  await page.waitForSelector(sel, { timeout: 60000 });
  await page.click(sel);
}

async function journeyA(labels, trace) {
  const log = { journey: 'A_assessments_students_result', steps: [] };
  log.fixtureTrace = trace;
  if (trace.boundary !== 'ok') {
    log.pass = false;
    log.verify = { label: trace.boundary, pass: false };
    return log;
  }

  await clickByTestId(page, 'nav-assessments').catch(async () => {
    await page.evaluate(() => {
      const links = [...document.querySelectorAll('a,button,[role="button"]')];
      const hit = links.find((el) => /Assessments/i.test(el.textContent || ''));
      hit?.click();
    });
  });
  log.steps.push({ step: 'open_assessments' });
  await waitForText(page, /Expired|Active|All/i);

  const tabKey = trace.filterStrategy?.selectedTab ?? 'expired';
  const tabPattern =
    tabKey === 'expired' ? /Expired\s*\(\d+\)|Expired/i : tabKey === 'active' ? /Active/i : /All/i;
  await page.evaluate((pat) => {
    const re = new RegExp(pat.slice(1, -2), pat.slice(-1));
    const nodes = [...document.querySelectorAll('button,[role="tab"],[role="button"],div')];
    const hit = nodes.find((el) => re.test((el.textContent || '').trim()));
    hit?.click();
  }, tabPattern.source);
  log.steps.push({ step: `tab_${tabKey}` });
  await new Promise((r) => setTimeout(r, 1200));

  const searchQ = trace.filterStrategy?.searchQuery || labels.searchToken || '';
  if (searchQ) {
    const searchSel = '[data-testid="assessments-search-input"]';
    await page.waitForSelector(searchSel, { timeout: 30000 });
    await page.click(searchSel, { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type(searchSel, searchQ, { delay: 8 });
    log.steps.push({ step: 'search_filter', tokenLength: searchQ.length });
    await new Promise((r) => setTimeout(r, 1000));
  }

  const studentsTestId = trace.openStudentsTestId;
  let loadMoreTaps = 0;
  while (loadMoreTaps <= trace.loadMoreTapsNeeded + 2) {
    const found = await page.$(`[data-testid="${studentsTestId}"]`);
    if (found) break;
    const more = await page.$('[data-testid="assessments-load-more"]');
    if (!more) break;
    await more.click();
    loadMoreTaps += 1;
    await new Promise((r) => setTimeout(r, 800));
  }
  log.steps.push({ step: 'locate_students_control', loadMoreTaps, testId: studentsTestId });

  await clickByTestId(page, studentsTestId);
  log.steps.push({ step: 'open_student_list' });
  await waitForText(page, new RegExp(`Students for:|${labels.quizTitle}`, 'i'));

  await clickByTestId(page, `student-row-${FIXTURE.studentId}`);
  log.steps.push({ step: 'open_student' });
  await waitForText(page, /Score|evaluated|correct/i, { timeoutMs: 120000 });

  const text = await evaluateBody(page);
  await page.screenshot({ path: join(evidence, 'journey-a-result.png'), fullPage: true });
  const verify = verifyWorksheetMetrics(text, labels);
  log.verify = { label: 'worksheet_metrics', ...verify };
  log.pass = verify.pass;
  return log;
}

async function journeyB(labels) {
  const log = { journey: 'B_analytics_view_analytics_result', steps: [] };
  await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('a,button,[role="button"]')];
    const hit = nodes.find((el) => /Analytics/i.test(el.textContent || ''));
    hit?.click();
  });
  log.steps.push({ step: 'analytics_tab' });
  await waitForText(page, /Analytics|Class/i);

  const classLabel = labels.classLabel || '4A-Mathematics';
  await page.evaluate((label) => {
    const nodes = [...document.querySelectorAll('button,[role="button"],div,span')];
    const hit = nodes.find((el) => (el.textContent || '').includes(label));
    hit?.click();
  }, classLabel);
  log.steps.push({ step: 'open_class', classLabel });
  await new Promise((r) => setTimeout(r, 1500));

  const quizNeedle = labels.searchToken || labels.quizTitle.slice(0, 16);
  await waitForText(page, quizNeedle);
  await page.evaluate((needle) => {
    const nodes = [...document.querySelectorAll('button,[role="button"],div,span,a')];
    const hit = nodes.find((el) => (el.textContent || '').includes(needle));
    hit?.click();
  }, quizNeedle);
  log.steps.push({ step: 'quiz', needle: quizNeedle });
  await new Promise((r) => setTimeout(r, 1500));

  await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('button,[role="button"],a')];
    const hit = nodes.find((el) => /View Analytics/i.test(el.textContent || ''));
    hit?.click();
  });
  log.steps.push({ step: 'view_analytics' });
  await new Promise((r) => setTimeout(r, 2000));

  await page.evaluate((name) => {
    const nodes = [...document.querySelectorAll('button,[role="button"],div,span,tr')];
    const hit = nodes.find((el) => (el.textContent || '').includes(name));
    hit?.click();
  }, FIXTURE.studentName);
  log.steps.push({ step: 'open_student' });
  await waitForText(page, /Score|evaluated|correct/i, { timeoutMs: 120000 });

  const text = await evaluateBody(page);
  await page.screenshot({ path: join(evidence, 'journey-b-result.png'), fullPage: true });
  const verify = verifyWorksheetMetrics(text, labels);
  log.verify = { label: 'worksheet_metrics', ...verify };
  log.pass = verify.pass;
  return log;
}

let page;

async function main() {
  if (!existsSync(credFile)) process.exit(2);
  const which = process.argv[2] || 'all';
  const labels = await loadFixtureLabels();
  const { trace } = await loadFixtureTrace();

  const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 1280, height: 900 } });
  const context = await browser.createBrowserContext();
  page = await context.newPage();
  try {
    await loginInstructor(page);
    const results = {};
    let failed = false;
    if (which === 'a' || which === 'all') {
      results.a = await journeyA(labels, trace);
      writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(results.a, null, 2));
      if (!results.a.pass) failed = true;
    }
    if (which === 'b' || which === 'all') {
      results.b = await journeyB(labels);
      writeFileSync(join(evidence, 'journey-b.json'), JSON.stringify(results.b, null, 2));
      if (!results.b.pass) failed = true;
    }
    writeFileSync(
      join(evidence, 'meta.json'),
      JSON.stringify({ sha, fixtureQuizId: FIXTURE.quizId }, null, 2),
    );
    console.log(JSON.stringify({ sha, results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { pass: v.pass }])) }));
    if (failed) process.exitCode = 1;
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

main().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
