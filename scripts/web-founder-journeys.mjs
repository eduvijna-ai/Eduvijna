/**
 * Founder acceptance journeys on Expo web (Puppeteer).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer';
import {
  FIXTURE,
  loadFixtureLabels,
  loadFixtureAnalyticsQuizPage,
  loadFixtureResultEvidenceFromCredentials,
} from './lib/founder-fixture.mjs';
import { loadFixtureTrace } from './lib/assessments-android-locate.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(repoRoot, '.dev-api-document-workflow-run', 'runtime-evidence', 'web-journeys');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
import {
  ENGINEERING_EXPO_WEB_URL,
  engineeringImplementationSha,
} from './lib/engineering-runtime-target.mjs';

const baseUrl = process.env.EXPO_WEB_URL || ENGINEERING_EXPO_WEB_URL;
const sha = engineeringImplementationSha();

mkdirSync(evidence, { recursive: true });

async function evaluateBody(page) {
  return page.evaluate(() => document.body?.innerText ?? '');
}

async function waitForAuthenticatedShell(page, { timeoutMs = 120000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await page.evaluate(() => {
      const body = document.body?.innerText ?? '';
      const loginSubmit = document.querySelector('[data-testid="login-submit-button"]');
      const loginEmail = document.querySelector('[data-testid="login-email-input"]');
      const hasLogin = Boolean(loginSubmit || loginEmail);
      const hasAssessments = body.includes('Assessments');
      const hasHome = body.includes('Home') || body.includes('Dashboard');
      const hasSignIn = body.includes('Sign in');
      if (hasAssessments || (hasHome && !hasSignIn && !hasLogin)) {
        return { ready: true };
      }
      return { ready: false };
    });
    if (state.ready) return;
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
  await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 120000 });
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

async function verifyWorksheetMetricsOnPage(page, labels, resultEvidence = {}) {
  return page.evaluate(
    ({ fixture, labels, resultEvidence }) => {
      const identityNeedle =
        resultEvidence.identityLabel ||
        `quiz-${fixture.quizId} attempt-${fixture.attemptId} student-${fixture.studentId}`;
      const summary = document.querySelector('[data-testid="quiz-result-summary"]');
      const aria = summary?.getAttribute('aria-label') || '';
      const text = document.body?.innerText ?? '';
      const blob = `${text}\n${aria}`;
      const identityOk = blob.includes(identityNeedle);
      const scoreOk =
        identityOk && (/\b60\s*%/.test(blob) || /Score\s*:\s*60/i.test(blob));
      const evaluatedOk =
        identityOk &&
        (/(evaluated|items|questions).{0,16}\b10\b/i.test(blob) ||
          /\b10\b.{0,16}(evaluated|items)/i.test(blob) ||
          /\b\d+\s*\/\s*10\b/.test(blob) ||
          (blob.match(/\bQ\d+\b/g) || []).length >= fixture.expectedEvaluatedItems);
      const correctOk =
        identityOk &&
        (/\b6\b\s*correct/i.test(blob) ||
          /Correct\s*:\s*6/i.test(blob) ||
          /6\s*\/\s*10/i.test(blob));
      const studentOk = blob.includes(fixture.studentName);
      const titleOk = blob.includes(labels.quizTitle) || (identityOk && studentOk);
      const contentOk =
        !resultEvidence.firstQuestionSnippet ||
        blob.includes(resultEvidence.firstQuestionSnippet.slice(0, 24)) ||
        (blob.match(/\bQ\d+\b/g) || []).length >= fixture.expectedEvaluatedItems;
      const answerOk =
        !resultEvidence.firstAnswerSnippet ||
        blob.includes(resultEvidence.firstAnswerSnippet.slice(0, 16)) ||
        (blob.match(/\bQ\d+\b/g) || []).length >= fixture.expectedEvaluatedItems;
      return {
        pass:
          identityOk &&
          scoreOk &&
          evaluatedOk &&
          correctOk &&
          studentOk &&
          titleOk &&
          contentOk &&
          answerOk,
        identityOk,
        scoreOk,
        evaluatedOk,
        correctOk,
        studentOk,
        titleOk,
        contentOk,
        answerOk,
        identityNeedle,
        ariaSample: aria.slice(0, 80),
      };
    },
    { fixture: FIXTURE, labels, resultEvidence },
  );
}

async function clickByTestId(page, testId) {
  const sel = `[data-testid="${testId}"]`;
  await page.waitForSelector(sel, { timeout: 60000 });
  await page.click(sel);
}

async function journeyA(labels, trace, resultEvidence = {}) {
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

  await page.screenshot({ path: join(evidence, 'journey-a-result.png'), fullPage: true });
  const verify = await verifyWorksheetMetricsOnPage(page, labels, resultEvidence);
  log.verify = { label: 'worksheet_metrics', ...verify };
  log.pass = verify.pass;
  return log;
}

async function journeyB(labels, resultEvidence = {}) {
  const log = { journey: 'B_analytics_view_analytics_result', steps: [] };
  await clickByTestId(page, 'nav-analytics').catch(async () => {
    await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('a,button,[role="button"]')];
      const hit = nodes.find((el) => /Analytics/i.test(el.textContent || ''));
      hit?.click();
    });
  });
  log.steps.push({ step: 'analytics_tab' });
  await waitForText(page, /Class Overview|Analytics Dashboard/i);
  await page.waitForSelector('[data-testid="analytics-date-from-input"]', { timeout: 60000 });
  for (const [testId, value] of [
    ['analytics-date-from-input', '2026-08-01'],
    ['analytics-date-to-input', '2026-10-13'],
  ]) {
    const sel = `[data-testid="${testId}"]`;
    await page.click(sel, { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type(sel, value, { delay: 8 });
  }
  await clickByTestId(page, 'analytics-date-apply');
  log.steps.push({ step: 'analytics_date_range', from: '2026-08-01', to: '2026-10-13' });
  await new Promise((r) => setTimeout(r, 4500));

  await clickByTestId(page, `analytics-class-card-${FIXTURE.classroomId}`).catch(async () => {
    const classLabel = labels.classLabel || '4A-Mathematics';
    await page.evaluate((label) => {
      const nodes = [...document.querySelectorAll('button,[role="button"],div,span')];
      const hit = nodes.find((el) => (el.textContent || '').includes(label));
      hit?.click();
    }, classLabel);
  });
  log.steps.push({ step: 'open_class', classroomId: FIXTURE.classroomId });
  await new Promise((r) => setTimeout(r, 1500));

  const viewAnalyticsTestId = `analytics-quiz-view-${FIXTURE.quizId}-${FIXTURE.sessionId}-open`;
  let viewOpened = false;
  const pageHint = await loadFixtureAnalyticsQuizPage().catch(() => null);
  if (pageHint?.found) {
    log.steps.push({
      step: 'fixture_quiz_list_hint',
      index: pageHint.index,
      page: pageHint.page,
      total: pageHint.total,
      note: 'hint only; selection uses session-scoped testID + pagination',
    });
  }
  const clickFixtureViewAnalytics = async (pageTry) => {
    const sel = `[data-testid="${viewAnalyticsTestId}"]`;
    try {
      await page.waitForSelector(sel, { timeout: 4000 });
      const hit = await page.$(sel);
      if (!hit) return false;
      await hit.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await hit.click();
      log.steps.push({ step: 'view_analytics', testId: viewAnalyticsTestId, pageTry, via: 'testid' });
      return true;
    } catch {
      const viaLabel = await page.evaluate((quizTitle) => {
        const needle = String(quizTitle || '').slice(0, 28);
        const nodes = [...document.querySelectorAll('[aria-label],[data-testid]')];
        const match = nodes.find((el) => {
          const label = el.getAttribute('aria-label') || '';
          return label.includes('View analytics for') && label.includes(needle);
        });
        if (!match) return false;
        match.scrollIntoView({ block: 'center' });
        match.click();
        return true;
      }, labels.quizTitle);
      if (viaLabel) {
        log.steps.push({ step: 'view_analytics', pageTry, via: 'aria_label' });
        return true;
      }
      return false;
    }
  };

  for (let pageTry = 0; pageTry < 10 && !viewOpened; pageTry++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 400));
    viewOpened = await clickFixtureViewAnalytics(pageTry);
    if (viewOpened) break;
    const nextBtn =
      (await page.$('[data-testid="analytics-quiz-pagination-next"]')) ||
      (await page.$('[data-testid="analytics-pagination-next"]'));
    if (!nextBtn) break;
    const canNext = await page.evaluate((el) => {
      const label = (el.textContent || '').toLowerCase();
      if (label.includes('next') && el.getAttribute('aria-disabled') === 'true') return false;
      const style = window.getComputedStyle(el);
      return style.pointerEvents !== 'none' && style.opacity !== '0';
    }, nextBtn);
    if (!canNext) break;
    await nextBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await nextBtn.click();
    log.steps.push({ step: 'quiz_pagination_next', pageTry });
    await new Promise((r) => setTimeout(r, 1800));
  }
  if (!viewOpened) {
    const summaryRowId = `analytics-summary-row-${FIXTURE.quizId}-${FIXTURE.sessionId}`;
    for (let pageTry = 0; pageTry < 10 && !viewOpened; pageTry++) {
      const row = await page.$(`[data-testid="${summaryRowId}"]`);
      if (row) {
        await row.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await row.click();
        viewOpened = true;
        log.steps.push({ step: 'open_quiz_drill', via: 'summary_row', pageTry });
        break;
      }
      const nextBtn =
        (await page.$('[data-testid="analytics-summary-pagination-next"]')) ||
        (await page.$('[data-testid="analytics-pagination-next"]'));
      if (!nextBtn) break;
      await nextBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await nextBtn.click();
      log.steps.push({ step: 'summary_pagination_next', pageTry });
      await new Promise((r) => setTimeout(r, 1800));
    }
  }
  if (!viewOpened) {
    log.debugQuizViewTestIds = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid*="analytics-quiz-view-479"]')].map((e) =>
        e.getAttribute('data-testid'),
      ),
    );
    log.pass = false;
    log.verify = { label: 'analytics_view_analytics', pass: false, testId: viewAnalyticsTestId };
    return log;
  }
  await new Promise((r) => setTimeout(r, 2000));

  const viewResultId = `analytics-view-result-${FIXTURE.studentId}-${FIXTURE.attemptId}`;
  let openedResult = false;
  for (let pageTry = 0; pageTry < 6 && !openedResult; pageTry++) {
    try {
      await page.waitForSelector(`[data-testid="${viewResultId}"]`, { timeout: 8000 });
      const btn = await page.$(`[data-testid="${viewResultId}"]`);
      if (btn) {
        await btn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await btn.click();
        openedResult = true;
        log.steps.push({ step: 'open_saved_result', testId: viewResultId, pageTry });
        break;
      }
    } catch {
      const nextBtn =
        (await page.$('[data-testid="analytics-attempt-pagination-next"]')) ||
        (await page.$('[data-testid="analytics-pagination-next"]'));
      if (!nextBtn) break;
      await nextBtn.click();
      log.steps.push({ step: 'attempt_pagination_next', pageTry });
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  if (!openedResult) {
    await page.evaluate((sid, aid) => {
      const nodes = [...document.querySelectorAll('[aria-label],[data-testid]')];
      const hit = nodes.find((el) => {
        const t = el.getAttribute('aria-label') || el.getAttribute('data-testid') || '';
        return /View saved result|View Details/i.test(t);
      });
      hit?.click();
    }, FIXTURE.studentId, FIXTURE.attemptId);
    log.steps.push({ step: 'open_saved_result_fallback' });
  }
  await page.waitForSelector('[data-testid="quiz-result-summary"]', { timeout: 120000 });

  await page.screenshot({ path: join(evidence, 'journey-b-result.png'), fullPage: true });
  const verify = await verifyWorksheetMetricsOnPage(page, labels, resultEvidence);
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
    await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
    await waitForAuthenticatedShell(page);
    let resultEvidence = {};
    try {
      resultEvidence = await loadFixtureResultEvidenceFromCredentials();
    } catch {
      resultEvidence = {
        identityLabel: `quiz-${FIXTURE.quizId} attempt-${FIXTURE.attemptId} student-${FIXTURE.studentId}`,
      };
    }
    const results = {};
    let failed = false;
    if (which === 'a' || which === 'all') {
      results.a = await journeyA(labels, trace, resultEvidence);
      writeFileSync(join(evidence, 'journey-a.json'), JSON.stringify(results.a, null, 2));
      if (!results.a.pass) failed = true;
    }
    if (which === 'b' || which === 'all') {
      results.b = await journeyB(labels, resultEvidence);
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
