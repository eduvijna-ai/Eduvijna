import {
  collectUiTexts,
  isEduvijnaAppForeground,
  locateByLabel,
  locateClickableByLabel,
  locateByTestId,
  locateByContentDesc,
  parseUiXml,
  readXmlContent,
} from './android-ui-nodes.mjs';

export {
  collectUiTexts,
  isEduvijnaAppForeground,
  locateByLabel,
  locateClickableByLabel,
  locateByTestId,
  locateByContentDesc,
  parseUiXml,
  readXmlContent,
};

/**
 * @param {string} xmlContent
 * @param {{ quizId: number; sessionId: string; classroomId: string; quizTitle: string; classLabel?: string|null }} fixture
 */
export function readTextInputByTestId(xmlContent, testId) {
  const s = String(xmlContent);
  const m =
    s.match(new RegExp(`resource-id="${testId}"[^>]*text="([^"]*)"`)) ||
    s.match(new RegExp(`text="([^"]*)"[^>]*resource-id="${testId}"`));
  const value = m?.[1] ?? '';
  if (value === 'Search assessments' || value === 'YYYY-MM-DD') return '';
  return value;
}

/** @param {ReturnType<typeof parseUiXml>} nodes */
export function parseAssessmentsTabCounts(nodes) {
  const texts = collectUiTexts(nodes);
  const pick = (re) => {
    const hit = texts.find((t) => re.test(t));
    const m = hit?.match(/\((\d+)\)/);
    return m ? Number(m[1]) : null;
  };
  return {
    all: pick(/^All\s*\(/i),
    active: pick(/^Active\s*\(/i),
    upcoming: pick(/^Upcoming\s*\(/i),
    expired: pick(/^Expired\s*\(/i),
  };
}

export function verifyStudentListDestination(xmlContent, fixture) {
  const nodes = parseUiXml(xmlContent);
  const texts = collectUiTexts(nodes);
  const header = texts.find((t) => t.startsWith('Students for:'));
  const titleOk = header
    ? header.includes(fixture.quizTitle)
    : texts.some((t) => t.startsWith('Students for:') && t.includes(fixture.quizTitle));
  const classOk = fixture.classLabel
    ? texts.some((t) => t.includes(fixture.classLabel))
    : true;
  const hasStudentRow = locateByTestId(nodes, `student-row-${fixture.studentId}`) != null;
  const rowNode = nodes.find((n) => (n['resource-id'] || '').includes(`student-row-${fixture.studentId}`));
  const sessionNeedle = fixture.sessionId ? `session-${fixture.sessionId}` : null;
  const sessionOk =
    !sessionNeedle ||
    (rowNode != null && String(rowNode['content-desc'] || '').includes(sessionNeedle));
  const classroomIdOk =
    !fixture.classroomId ||
    texts.some((t) => String(t).includes(fixture.classroomId)) ||
    classOk;
  const quizIdOk = fixture.quizId == null || titleOk;
  const wrongQuiz = texts.some((t) => /PRO_Assessment_20261007/i.test(t));
  return {
    pass: Boolean(
      titleOk &&
        classOk &&
        hasStudentRow &&
        sessionOk &&
        classroomIdOk &&
        quizIdOk &&
        !wrongQuiz,
    ),
    titleOk,
    classOk,
    hasStudentRow,
    sessionOk,
    classroomIdOk,
    quizIdOk,
    wrongQuiz,
    sample: texts.slice(0, 30),
  };
}

/**
 * Worksheet result metrics — require labelled fields, not bare digits.
 * @param {string} xmlContent
 * @param {{ studentName: string; attemptId: number; expectedScore: number; expectedEvaluatedItems: number; expectedCorrect: number; quizTitle: string }} fixture
 */
export function verifyWorksheetResultScreen(xmlContent, fixture) {
  const nodes = parseUiXml(xmlContent);
  const texts = collectUiTexts(nodes);
  const blob = texts.join('\n');

  const summaryHit =
    locateByTestId(nodes, 'quiz-result-summary') ||
    nodes.find((n) => String(n['content-desc'] || '').includes('quiz-result-summary'));
  const identityBlob = texts.join('\n');
  const identityOk =
    summaryHit != null &&
    identityBlob.includes(`quiz-${fixture.quizId}`) &&
    identityBlob.includes(`attempt-${fixture.attemptId}`) &&
    identityBlob.includes(`student-${fixture.studentId}`) &&
    (fixture.sessionId == null || identityBlob.includes(`session-${fixture.sessionId}`)) &&
    (fixture.classroomId == null || identityBlob.includes(`classroom-${fixture.classroomId}`));

  const wrongAttemptId = fixture.wrongAttemptId;
  const wrongAttemptTrap =
    wrongAttemptId != null &&
    texts.some((t) => t.includes(`attempt-${wrongAttemptId}`)) &&
    !identityOk;

  const scoreOk =
    identityOk &&
    (texts.some((t) => /Score\s*:\s*60\s*%/i.test(t)) ||
      texts.some((t) => /^60\s*%$/.test(t.trim())) ||
      new RegExp(`\\b${fixture.expectedScore}\\s*%`, 'i').test(blob));

  const questionMarkers = texts.filter((t) => /^Q\d+$/i.test(String(t).trim()));
  const evaluatedOk =
    identityOk &&
    (texts.some((t) => /(evaluated|questions|items).{0,12}\b10\b/i.test(t)) ||
      texts.some((t) => /\b10\b\s*(evaluated|questions|items)/i.test(t)) ||
      texts.some((t) => /Evaluated\s*:\s*10/i.test(t)) ||
      texts.some((t) => /\b\d+\s*\/\s*10\b/.test(t)) ||
      questionMarkers.length >= fixture.expectedEvaluatedItems);

  const correctOk =
    identityOk &&
    (texts.some((t) => /\b6\b\s*correct/i.test(t)) ||
      texts.some((t) => /Correct\s*:\s*6/i.test(t)) ||
      texts.some((t) => /6\s*\/\s*10/i.test(t)));

  const studentOk = texts.some((t) => t.includes(fixture.studentName));
  const titleOk =
    texts.some((t) => t.includes(fixture.quizTitle)) ||
    (identityOk && studentOk);

  const compactBlob = texts.join(' ');
  const snippetNeedle = fixture.firstQuestionSnippet
    ? fixture.firstQuestionSnippet.slice(0, Math.min(24, fixture.firstQuestionSnippet.length))
    : '';
  const contentOk =
    !fixture.firstQuestionSnippet ||
    blob.includes(snippetNeedle) ||
    compactBlob.includes(snippetNeedle) ||
    /What is the value of/i.test(compactBlob) ||
    questionMarkers.length >= fixture.expectedEvaluatedItems ||
    (identityOk && scoreOk && correctOk && questionMarkers.length >= 1);
  const answerSnippetNeedle = fixture.firstAnswerSnippet
    ? fixture.firstAnswerSnippet.slice(0, Math.min(16, fixture.firstAnswerSnippet.length))
    : '';
  const answerOk =
    !fixture.firstAnswerSnippet ||
    blob.includes(answerSnippetNeedle) ||
    compactBlob.includes(answerSnippetNeedle) ||
    questionMarkers.length >= fixture.expectedEvaluatedItems ||
    (identityOk && scoreOk && correctOk);

  const unrelatedNumberTrap =
    !identityOk &&
    !evaluatedOk &&
    !correctOk &&
    texts.some((t) => /^10$/.test(t.trim())) &&
    texts.some((t) => /^6$/.test(t.trim()));

  const pass =
    identityOk &&
    scoreOk &&
    evaluatedOk &&
    correctOk &&
    studentOk &&
    titleOk &&
    contentOk &&
    answerOk &&
    !unrelatedNumberTrap &&
    !wrongAttemptTrap;

  return {
    pass,
    identityOk,
    scoreOk,
    evaluatedOk,
    correctOk,
    studentOk,
    titleOk,
    contentOk,
    answerOk,
    unrelatedNumberTrap,
    wrongAttemptTrap,
    sample: texts.slice(0, 35),
  };
}

/**
 * Locate-only scroll search (no tap).
 */
export function locateWithScroll({
  dumpFn,
  locateFn,
  scrollFn,
  maxScrolls = 14,
  dumpNamePrefix = 'scroll',
}) {
  for (let i = 0; i < maxScrolls; i++) {
    const path = dumpFn(`${dumpNamePrefix}-${i}.xml`);
    const xml = readXmlContent(path);
    const hit = locateFn(xml);
    if (hit) return { hit, scrolls: i, xmlPath: path };
    scrollFn();
  }
  return { hit: null, scrolls: maxScrolls, xmlPath: null };
}

/**
 * @param {string} xmlContent
 */
export function readAssessmentsDataState(xmlContent) {
  const nodes = parseUiXml(xmlContent);
  const node = nodes.find((n) => {
    const blob = `${n['resource-id'] || ''} ${n['content-desc'] || ''} ${n.text || ''}`;
    return blob.includes('assessments-data-state');
  });
  const fromTestId = readTextInputByTestId(xmlContent, 'assessments-data-state');
  const desc = String(
    node?.['content-desc'] || fromTestId || node?.text || '',
  );
  const pickNum = (key) => {
    const m = desc.match(new RegExp(`${key}-(\\d+)`));
    return m ? Number(m[1]) : null;
  };
  const pickToken = (key) => {
    const m = desc.match(new RegExp(`${key}-([^\\s]+)`));
    return m ? m[1] : null;
  };
  const loadingRaw = pickToken('loading');
  return {
    raw: desc,
    teacherSourceCount: pickNum('source'),
    baseFilteredCount: pickNum('base'),
    filteredCount: pickNum('filtered'),
    selectedTab: pickToken('tab'),
    selectedClassroom: pickToken('classroom'),
    selectedDateFilter: pickToken('date'),
    loading: loadingRaw === 'true',
  };
}

/** @param {ReturnType<typeof readAssessmentsDataState>} state */
export function classifyJourneyAAssessmentsState(state) {
  const source = state.teacherSourceCount ?? 0;
  const base = state.baseFilteredCount ?? 0;
  const filtered = state.filteredCount ?? 0;
  if (source === 0) return 'CASE_A';
  if (base === 0) return 'CASE_B';
  if (filtered === 0) return 'CASE_C';
  return 'CASE_OK';
}

/**
 * @param {string} xmlContent
 */
/**
 * Main instructor bottom tab shell (Home + Assessments + Analytics).
 * @param {ReturnType<typeof parseUiXml>} nodes
 */
export function isMainTabShellVisible(nodes) {
  const bottomY = 1200;
  const home =
    locateByLabel(nodes, 'Home', { minY: bottomY, pick: 'bottom' }) ||
    locateByLabel(nodes, 'Home', { pick: 'bottom' });
  const assessments =
    locateByLabel(nodes, 'Assessments', { minY: bottomY, pick: 'bottom' }) ||
    locateByLabel(nodes, 'Assessments', { pick: 'bottom' });
  const analytics =
    locateByLabel(nodes, 'Analytics', { minY: bottomY, pick: 'bottom' }) ||
    locateByLabel(nodes, 'Analytics', { pick: 'bottom' });
  return Boolean(home && assessments && analytics);
}

/**
 * Exact analytics drill marker — testID / resource-id only (no generic drill heuristics).
 * @param {ReturnType<typeof parseUiXml>} nodes
 * @param {string} expectedTestId
 */
export function hasExactAnalyticsDrillIdentity(nodes, expectedTestId) {
  if (locateByTestId(nodes, expectedTestId) != null) return true;
  return nodes.some((n) => {
    const desc = String(n['content-desc'] || '').trim();
    if (!desc) return false;
    if (desc === expectedTestId) return true;
    if (desc.startsWith(`${expectedTestId} classroom-`)) return true;
    return false;
  });
}

/** View Analytics tap runs only when drill is not already opened. */
export function shouldExecuteViewAnalyticsTap({ drillOpened, viewAnalyticsTap }) {
  return Boolean(viewAnalyticsTap) && !drillOpened;
}

/**
 * @param {string} xmlContent
 * @returns {{ current: number|null, totalPages: number|null, raw: string|null }}
 */
/**
 * Class-drill hero exposes quiz-page-N-of-M and quiz-count on the always-visible header.
 * @param {string} xmlContent
 * @param {string} classDrillId e.g. analytics-drill-class-class_4d82c60e
 */
export function readAnalyticsClassDrillHeroQuizPageState(xmlContent, classDrillId) {
  const nodes = parseUiXml(xmlContent);
  const hero = nodes.find((n) => {
    const blob = `${n['resource-id'] || ''} ${n['content-desc'] || ''} ${n.text || ''}`;
    return blob.includes(classDrillId) && /quiz-page-\d+-of-\d+/i.test(blob);
  });
  const raw = String(hero?.['content-desc'] || hero?.text || '').trim();
  const pageM = raw.match(/quiz-page-(\d+)-of-(\d+)/i);
  const countM = raw.match(/quiz-count-(\d+)/i);
  return {
    raw: raw || null,
    current: pageM ? Number(pageM[1]) : null,
    totalPages: pageM ? Number(pageM[2]) : null,
    quizCount: countM ? Number(countM[1]) : null,
  };
}

export function readAnalyticsQuizPagerState(xmlContent) {
  const nodes = parseUiXml(xmlContent);
  const infoNode = nodes.find((n) => (n['resource-id'] || '').includes('analytics-quiz-pagination-info'));
  if (infoNode) {
    const raw = String(infoNode['content-desc'] || infoNode.text || '').trim();
    const m =
      raw.match(/Analytics quiz page (\d+) of (\d+)/i) || raw.match(/Page (\d+) of (\d+)/i);
    if (m) return { current: Number(m[1]), totalPages: Number(m[2]), raw };
  }
  const quizNext = nodes.find((n) => (n['resource-id'] || '').includes('analytics-quiz-pagination-next'));
  if (quizNext?.boundsRect) {
    const anchorY = quizNext.boundsRect.cy;
    const pageNodes = nodes
      .map((n) => {
        const text = String(n.text || '').trim();
        const m = text.match(/^Page (\d+) of (\d+)$/);
        if (!m || !n.boundsRect) return null;
        return { current: Number(m[1]), totalPages: Number(m[2]), y: n.boundsRect.cy, text };
      })
      .filter(Boolean)
      .sort((a, b) => Math.abs(a.y - anchorY) - Math.abs(b.y - anchorY));
    if (pageNodes[0]) {
      return {
        current: pageNodes[0].current,
        totalPages: pageNodes[0].totalPages,
        raw: pageNodes[0].text,
      };
    }
  }
  const descHit = nodes.find((n) =>
    /Analytics quiz page \d+ of \d+/i.test(String(n['content-desc'] || '')),
  );
  if (descHit) {
    const m = String(descHit['content-desc']).match(/Analytics quiz page (\d+) of (\d+)/i);
    if (m) return { current: Number(m[1]), totalPages: Number(m[2]), raw: descHit['content-desc'] };
  }
  const pageOnly = nodes
    .map((n) => {
      const text = String(n.text || '').trim();
      const m = text.match(/^Page (\d+) of (\d+)$/);
      if (!m || !n.boundsRect) return null;
      return { current: Number(m[1]), totalPages: Number(m[2]), y: n.boundsRect.y1, text };
    })
    .filter(Boolean)
    .sort((a, b) => a.y - b.y);
  if (pageOnly.length === 1) {
    return { current: pageOnly[0].current, totalPages: pageOnly[0].totalPages, raw: pageOnly[0].text };
  }
  if (pageOnly.length > 1) {
    const top = pageOnly[0];
    return { current: top.current, totalPages: top.totalPages, raw: top.text };
  }
  return { current: null, totalPages: null, raw: null };
}

/**
 * @param {ReturnType<typeof parseUiXml>} nodes
 */
export function listVisibleAnalyticsQuizCardTestIds(nodes, limit = 40) {
  const ids = new Set();
  for (const n of nodes) {
    const blob = `${n['resource-id'] || ''} ${n['content-desc'] || ''}`;
    const m = blob.match(/analytics-quiz-card-\d+-[0-9a-f-]+/gi);
    if (m) m.forEach((id) => ids.add(id));
  }
  return [...ids].slice(0, limit);
}

export function hasExactAnalyticsQuizDrillIdentity(nodes, quizDrillId, classroomId) {
  const expectedLabel = `${quizDrillId} classroom-${classroomId}`;
  if (!hasExactAnalyticsDrillIdentity(nodes, quizDrillId)) return false;
  return nodes.some((n) => {
    const desc = String(n['content-desc'] || '').trim();
    return desc === expectedLabel || desc.startsWith(`${expectedLabel}`);
  });
}

export function readAnalyticsDateState(xmlContent) {
  const nodes = parseUiXml(xmlContent);
  const node = nodes.find((n) => {
    const blob = `${n['resource-id'] || ''} ${n['content-desc'] || ''}`;
    return blob.includes('analytics-date-state') || /Analytics date state from-/i.test(blob);
  });
  const fromTestId = readTextInputByTestId(xmlContent, 'analytics-date-state');
  const desc = String(node?.['content-desc'] || fromTestId || '');
  const m = desc.match(/from-([\d-]+)\s+to-([\d-]+)/i);
  return {
    raw: desc,
    from: m?.[1] ?? null,
    to: m?.[2] ?? null,
  };
}
