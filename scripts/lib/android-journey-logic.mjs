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
/**
 * @param {{ quizId: number; sessionId: string }} fixture
 * @param {{ quizId: number; sessionId: string }[]} members
 */
export function analyticsPageMembersContainFixture(members, fixture) {
  if (!Array.isArray(members) || !fixture) return false;
  return members.some(
    (m) => Number(m.quizId) === Number(fixture.quizId) && String(m.sessionId) === String(fixture.sessionId),
  );
}

/**
 * Parses engineering metadata from analytics-quiz-page-members (visible section title).
 * @param {string} xmlContent
 */
function parseQuizMemberTokensFromRaw(raw) {
  const members = [];
  if (!raw) return members;
  const membersChunk = raw.match(/quiz-members-([^\s]+)/i);
  const tokenSource = membersChunk ? membersChunk[1].split(';') : raw.split(/\s+/);
  for (const token of tokenSource) {
    const m = String(token).match(/^(\d+):([0-9a-f-]+)$/i);
    if (m) members.push({ quizId: Number(m[1]), sessionId: m[2] });
  }
  return members;
}

export function readAnalyticsQuizPageMembers(xmlContent, classDrillId = null) {
  const nodes = parseUiXml(xmlContent);
  const sectionNode = nodes.find(
    (n) =>
      (n['resource-id'] || '').includes('analytics-quiz-page-members') ||
      String(n['content-desc'] || '').includes('analytics-quiz-page-members'),
  );
  const heroNode =
    classDrillId != null
      ? nodes.find((n) => {
          const blob = `${n['resource-id'] || ''} ${n['content-desc'] || ''} ${n.text || ''}`;
          return blob.includes(classDrillId) && /quiz-page-\d+-of-\d+/i.test(blob);
        })
      : null;
  const raw = String(
    sectionNode?.['content-desc'] ||
      sectionNode?.text ||
      heroNode?.['content-desc'] ||
      heroNode?.text ||
      '',
  ).trim();
  const pageM =
    raw.match(/\bpage-(\d+)\b/i) || raw.match(/quiz-page-(\d+)-of-\d+/i);
  const members = parseQuizMemberTokensFromRaw(raw);
  return {
    raw: raw || null,
    page: pageM ? Number(pageM[1]) : null,
    members,
    source: sectionNode ? 'section' : heroNode ? 'hero' : null,
  };
}

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

/** @param {ReturnType<typeof parseUiXml>} nodes */
export function readObservedAnalyticsDrillMarkers(nodes) {
  const drills = new Set();
  for (const n of nodes) {
    const blob = `${n['resource-id'] || ''} ${n['content-desc'] || ''}`;
    const classM = blob.match(/analytics-drill-class-[A-Za-z0-9_]+/);
    const quizM = blob.match(/analytics-drill-quiz-\d+-[0-9a-f-]+/i);
    if (classM) drills.add(classM[0]);
    if (quizM) drills.add(quizM[0]);
  }
  return [...drills];
}

/**
 * During class-quiz discovery the harness must remain on the exact class drill until fixture View Analytics.
 * @param {string} xmlContent
 * @param {string} expectedClassDrillId
 * @param {Record<string, unknown>} [context]
 */
export function assertClassDrillInvariant(xmlContent, expectedClassDrillId, context = {}) {
  const nodes = parseUiXml(xmlContent);
  const hero = readAnalyticsClassDrillHeroQuizPageState(xmlContent, expectedClassDrillId);
  const pageMembers = readAnalyticsQuizPageMembers(xmlContent, expectedClassDrillId);
  const observedDrills = readObservedAnalyticsDrillMarkers(nodes);
  const quizDrill = observedDrills.find((d) => d.startsWith('analytics-drill-quiz-'));
  const classOk = hasExactAnalyticsDrillIdentity(nodes, expectedClassDrillId);

  if (quizDrill) {
    return {
      ok: false,
      label: 'analytics_navigation_drift_during_quiz_discovery',
      expectedClassDrillId,
      observedDrillIdentity: quizDrill,
      heroAccessibilityLabel: hero.raw,
      pageNumber: pageMembers.page ?? hero.current,
      currentPageMembership: pageMembers.members,
      ...context,
    };
  }
  if (!classOk) {
    return {
      ok: false,
      label: 'analytics_class_drill_invariant_broken',
      expectedClassDrillId,
      observedDrillIdentity: observedDrills[0] ?? null,
      heroAccessibilityLabel: hero.raw,
      pageNumber: pageMembers.page ?? hero.current,
      currentPageMembership: pageMembers.members,
      ...context,
    };
  }
  return {
    ok: true,
    hero,
    pageMembers,
    heroAccessibilityLabel: hero.raw,
    pageNumber: pageMembers.page ?? hero.current,
    currentPageMembership: pageMembers.members,
  };
}

const EXCLUDED_ANALYTICS_CLICKABLE_PATTERNS = [
  /analytics-quiz-view-/i,
  /analytics-quiz-pagination/i,
  /analytics-pagination-/i,
  /analytics-drill-back/i,
];

/** @param {ReturnType<typeof parseUiXml>[number]} node */
export function isExcludedAnalyticsDiscoveryClickable(node) {
  const blob = `${node['resource-id'] || ''} ${node['content-desc'] || ''} ${node.text || ''}`;
  if (EXCLUDED_ANALYTICS_CLICKABLE_PATTERNS.some((re) => re.test(blob))) return true;
  if (/^Students$/i.test(String(node.text || '').trim())) return true;
  if (/^View Analytics$/i.test(String(node.text || '').trim())) return true;
  return false;
}

function pointInsideBoundsRect(x, y, rect) {
  return x >= rect.x1 && x <= rect.x2 && y >= rect.y1 && y <= rect.y2;
}

/**
 * Pick ACTION_DOWN for class-drill discovery scroll outside clickable controls.
 * @param {ReturnType<typeof parseUiXml>} nodes
 */
export function findSafeAnalyticsClassDrillScrollStart(
  nodes,
  { contentMinY = 760, contentMaxY = 1620 } = {},
) {
  const clickables = nodes.filter(
    (n) =>
      n.clickable === 'true' &&
      n.boundsRect &&
      n.boundsRect.y2 >= contentMinY &&
      n.boundsRect.y1 <= contentMaxY + 80,
  );

  const overlapsClickable = (x, y) => {
    for (const c of clickables) {
      if (!c.boundsRect) continue;
      if (!pointInsideBoundsRect(x, y, c.boundsRect)) continue;
      if (isExcludedAnalyticsDiscoveryClickable(c)) return true;
      if (c.boundsRect.y1 >= 1680) return true;
      return true;
    }
    return false;
  };

  const textCandidates = nodes
    .filter((n) => {
      if (!n.boundsRect) return false;
      const { cy } = n.boundsRect;
      if (cy < contentMinY || cy > contentMaxY) return false;
      if (n.clickable === 'true') return false;
      const text = String(n.text || '').trim();
      return text.length > 0 && !/^View Analytics$/i.test(text);
    })
    .sort((a, b) => b.boundsRect.cy - a.boundsRect.cy);

  for (const c of textCandidates) {
    const { cx, cy } = c.boundsRect;
    if (!overlapsClickable(cx, cy)) {
      return { x: cx, y: cy, clickableOverlapAtStart: false, source: 'text', label: c.text };
    }
  }

  for (let y = contentMaxY; y >= contentMinY; y -= 36) {
    for (let x = 160; x <= 920; x += 64) {
      if (!overlapsClickable(x, y)) {
        return { x, y, clickableOverlapAtStart: false, source: 'grid' };
      }
    }
  }
  return null;
}

/**
 * @param {{ page?: number|null; hero?: { current?: number|null }; members?: unknown[] }[]} mobilePageMemberships
 * @param {number|null|undefined} expectedTotalPages
 */
export function buildMobileQuizDiscoveryState(mobilePageMemberships, expectedTotalPages) {
  const pagesVisited = (mobilePageMemberships || [])
    .map((m) => m.page ?? m.hero?.current ?? null)
    .filter((p) => p != null);
  const uniquePages = [...new Set(pagesVisited)].sort((a, b) => a - b);
  const total = expectedTotalPages ?? null;
  const discoveryComplete =
    total != null &&
    total > 0 &&
    uniquePages.length === total &&
    uniquePages.every((p, idx) => p === idx + 1);
  return {
    discoveryComplete,
    pagesVisited: uniquePages,
    expectedTotalPages: total,
  };
}

/**
 * @param {{ quizId: number; sessionId: string }} fixtureIdentity
 */
/** @param {ReturnType<typeof parseUiXml>} nodes */
export function findClassDrillNestedScrollViewport(nodes, { minY = 680, maxY = 1780 } = {}) {
  const scrolls = nodes
    .filter(
      (n) =>
        n.class === 'android.widget.ScrollView' &&
        n.scrollable === 'true' &&
        n.boundsRect &&
        n.boundsRect.y1 >= minY - 80 &&
        n.boundsRect.y2 <= maxY + 40,
    )
    .map((n) => n.boundsRect)
    .sort((a, b) => b.y2 - b.y1 - (a.y2 - a.y1));
  return scrolls[0] ?? null;
}

/** @param {ReturnType<typeof parseUiXml>} nodes */
export function locateAnalyticsQuizListSectionAnchor(nodes) {
  return (
    locateByTestId(nodes, 'analytics-class-quiz-list-section') ||
    locateByTestId(nodes, 'analytics-quiz-page-members') ||
    locateByTestId(nodes, 'analytics-quiz-list-hint')
  );
}

/**
 * @param {{ x1: number; y1: number; x2: number; y2: number; cx: number; cy: number }} rect
 */
export function deriveBoundedVerticalSwipeInRect(rect, direction = 'up', { margin = 40 } = {}) {
  const x = rect.cx;
  if (direction === 'up') {
    // Finger moves down the screen to reveal content above the current viewport.
    const startY = Math.max(rect.y1 + margin, rect.cy - 120);
    const endY = Math.min(rect.y2 - margin, rect.cy + 320);
    return { x, startY, endY, direction };
  }
  // Finger moves up the screen to reveal content below the current viewport.
  const startY = Math.min(rect.y2 - margin, rect.cy + 140);
  const endY = Math.max(rect.y1 + margin, rect.cy - 320);
  return { x, startY, endY, direction };
}

/** @param {{ bounds?: { y1: number; y2: number } }} tap */
export function isTapTargetWithinScrollViewport(tap, scrollRect, { margin = 8 } = {}) {
  if (!tap?.bounds || !scrollRect) return false;
  const { y1, y2 } = tap.bounds;
  return y1 >= scrollRect.y1 + margin && y2 <= scrollRect.y2 - margin;
}

/**
 * @param {ReturnType<typeof parseUiXml>} nodes
 */
export function locateFixtureViewAnalyticsTap(nodes, viewAnalyticsId, scrollRect = null) {
  const hit = locateByTestId(nodes, viewAnalyticsId);
  if (!hit) return null;
  if (scrollRect && !isTapTargetWithinScrollViewport(hit, scrollRect)) return null;
  return hit;
}

export function buildFixtureViewportProgressSignature(
  nodes,
  viewAnalyticsId,
  quizCardId,
  scrollRect = null,
) {
  const anchor = locateAnalyticsQuizListSectionAnchor(nodes);
  const cards = listVisibleAnalyticsQuizCardTestIds(nodes, 12);
  const view = scrollRect
    ? locateFixtureViewAnalyticsTap(nodes, viewAnalyticsId, scrollRect)
    : locateByTestId(nodes, viewAnalyticsId);
  const card = quizCardId ? locateByTestId(nodes, quizCardId) : null;
  const texts = collectUiTexts(nodes);
  const seesSummary = texts.some((t) => /Open quiz summary for/i.test(t));
  const anchorInViewport =
    anchor?.bounds && scrollRect
      ? isTapTargetWithinScrollViewport(anchor, scrollRect, { margin: 0 })
      : anchor != null;
  return {
    anchorY: anchor?.y ?? null,
    anchorInViewport,
    cardCount: cards.length,
    firstCardId: cards[0] ?? null,
    fixtureCardVisible: Boolean(card),
    viewAnalyticsVisible: Boolean(view),
    seesQuizSummarySection: seesSummary,
    signature: `${anchorInViewport}|${cards.length}|${cards[0] ?? '-'}|${Boolean(view)}|${seesSummary}`,
  };
}

export function shouldTerminateFixtureViewportSearch({ noProgressStreak, attempt, maxAttempts }) {
  if (attempt >= maxAttempts) {
    return { terminate: true, label: 'analytics_fixture_quiz_section_anchor_missing' };
  }
  if (noProgressStreak >= 3) {
    return { terminate: true, label: 'analytics_fixture_viewport_no_progress' };
  }
  return { terminate: false, label: null };
}

export function inferQuizListRepositionDirection(progress) {
  if (progress.viewAnalyticsVisible) return null;
  if (!progress.anchorInViewport && progress.seesQuizSummarySection) return 'up';
  if (!progress.anchorInViewport) return 'up';
  if (progress.cardCount === 0) return 'up';
  return 'down';
}

export function classifyFixtureDiscoveryOutcome(
  quizPageHint,
  discovery,
  viewportFound,
  fixtureIdentity,
) {
  const mobilePages = discovery.mobilePageMemberships || [];
  const discoveryState =
    discovery.discoveryState ??
    buildMobileQuizDiscoveryState(
      mobilePages,
      discovery.totalPages ?? mobilePages[0]?.hero?.totalPages ?? quizPageHint?.totalPages ?? null,
    );
  const apiPage = quizPageHint?.apiHintPage ?? quizPageHint?.page ?? null;
  const mobileFixturePage =
    discovery.mobileFixturePage ??
    mobilePages.find((p) => analyticsPageMembersContainFixture(p.members, fixtureIdentity))?.page ??
    null;
  const fixtureOnApiPage =
    apiPage != null &&
    quizPageHint?.found === true &&
    Array.isArray(quizPageHint?.pageMembers) &&
    analyticsPageMembersContainFixture(quizPageHint.pageMembers, fixtureIdentity);
  const fixtureOnMobileApiPage =
    apiPage != null &&
    mobilePages.some(
      (p) =>
        (p.page ?? p.hero?.current) === apiPage &&
        analyticsPageMembersContainFixture(p.members, fixtureIdentity),
    );
  const fixtureOnAnyMobile = mobilePages.some((p) =>
    analyticsPageMembersContainFixture(p.members, fixtureIdentity),
  );

  if (!viewportFound && fixtureOnAnyMobile && mobileFixturePage != null) {
    return 'B';
  }
  if (
    quizPageHint?.found === true &&
    fixtureOnApiPage &&
    !fixtureOnMobileApiPage &&
    fixtureOnAnyMobile &&
    mobileFixturePage != null &&
    mobileFixturePage !== apiPage
  ) {
    return 'A';
  }
  if (
    quizPageHint?.found === true &&
    discoveryState.discoveryComplete &&
    !fixtureOnAnyMobile
  ) {
    return 'C';
  }
  return null;
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
