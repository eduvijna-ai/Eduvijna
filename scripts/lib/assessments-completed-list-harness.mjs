/**
 * Assessments → Completed tab traversal (load-more, identity discovery).
 */
import { FIXTURE } from './founder-fixture.mjs';
import { readTextInputByTestId } from './android-journey-logic.mjs';

export function parseAssessmentsDataState(xml) {
  const m = /assessments-data-state ([^"]+)"/i.exec(xml);
  if (!m) return null;
  const parts = m[1].split(/\s+/);
  const out = {};
  for (const p of parts) {
    const [k, v] = p.split('-');
    if (k && v !== undefined) out[k] = v;
  }
  return out;
}

export function parseCompletedTabTotal(xml) {
  const m = /Completed\s*\((\d+)\)/i.exec(xml);
  return m ? Number(m[1]) : null;
}

export function parseLoadMoreRemaining(xml) {
  const m = /Load More\s*\((\d+)\s+remaining\)/i.exec(xml);
  return m ? Number(m[1]) : null;
}

export function hasLoadMoreControl(xml) {
  return /resource-id="assessments-load-more"/.test(xml) || /Load More\s*\(\d+\s+remaining\)/i.test(xml);
}

export function collectQuizTitlesFromXml(xml) {
  const titles = [];
  const re = /text="([^"]{8,120})"[^>]*class="android\.widget\.TextView"/gi;
  let m;
  while ((m = re.exec(xml))) {
    const t = m[1];
    if (/^(Score:|Due:|Completed|Ongoing|Missed|All |Load More|Filters|Classroom)/i.test(t)) continue;
    titles.push(t);
  }
  return [...new Set(titles)].slice(0, 80);
}

export function discoverFixtureIdentity(xml, quizTitle) {
  const sessionShort = FIXTURE.sessionId.slice(0, 8);
  const hits = {
    titleExact: xml.includes(quizTitle),
    titlePartial: quizTitle.length > 12 && xml.includes(quizTitle.slice(0, 14)),
    quiz479: /quiz-479|quiz_id=479|"479"/.test(xml),
    sessionPrefix: xml.includes(sessionShort),
    attempt207: /attempt-207|attempt_id=207/.test(xml),
    resultSummary: /quiz-result-summary[^"]*quiz-479/.test(xml),
  };
  const found = hits.titleExact || hits.titlePartial || hits.resultSummary;
  return { found, hits };
}

export function tapTestId(adb, xml, testId) {
  const m = new RegExp(`resource-id="${testId}"[^>]*bounds="([^"]+)"`, 'i').exec(xml);
  if (!m) return false;
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
  if (!c) return false;
  adb(`shell input tap ${(Number(c[1]) + Number(c[3])) / 2 | 0} ${(Number(c[2]) + Number(c[4])) / 2 | 0}`);
  return true;
}

function parseBoundsStr(b) {
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(b);
  if (!c) return null;
  return { x1: Number(c[1]), y1: Number(c[2]), x2: Number(c[3]), y2: Number(c[4]) };
}

function titleBoundsInXml(xml, quizTitle) {
  const esc = quizTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let m = new RegExp(`text="${esc}"[^>]*bounds="([^"]+)"`, 'i').exec(xml);
  if (!m && quizTitle.length > 14) {
    const prefix = quizTitle.slice(0, 14).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    m = new RegExp(`text="${prefix}[^"]*"[^>]*bounds="([^"]+)"`, 'i').exec(xml);
  }
  return m ? parseBoundsStr(m[1]) : null;
}

/** Results on the same completed card as the title (below title, not a generic View). */
export function findFixtureResultsTapTarget(xml, quizTitle) {
  const titleB = titleBoundsInXml(xml, quizTitle);
  if (!titleB) return { found: false, reason: 'title_not_in_xml' };
  const titleMidX = (titleB.x1 + titleB.x2) / 2;
  const candidates = [];
  const re = /text="Results"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/gi;
  let m;
  while ((m = re.exec(xml))) {
    const b = { x1: Number(m[1]), y1: Number(m[2]), x2: Number(m[3]), y2: Number(m[4]) };
    const midX = (b.x1 + b.x2) / 2;
    const belowTitle = b.y1 >= titleB.y2 - 24;
    const sameColumn = Math.abs(midX - titleMidX) < 420;
    const withinCard = b.y1 <= titleB.y2 + 340;
    if (belowTitle && sameColumn && withinCard) {
      candidates.push({ b, score: b.y1 - titleB.y2 });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  const pick = candidates.find((c) => c.score >= -20) || candidates[0];
  if (!pick) return { found: false, reason: 'no_results_on_fixture_card', titleB };
  return { found: true, bounds: pick.b };
}

export function scrollTitleIntoView(adb, xml, quizTitle, sleep, { needResultsFooter = false } = {}) {
  const titleB = titleBoundsInXml(xml, quizTitle);
  if (!titleB) return xml;
  const midY = (titleB.y1 + titleB.y2) / 2;
  const lowFooter =
    needResultsFooter &&
    !findFixtureResultsTapTarget(xml, quizTitle).found &&
    titleB.y2 > 1180;
  if (midY > 1500 || lowFooter) {
    adb('shell input swipe 540 1500 540 900 320');
    sleep(700);
    return null;
  }
  if (midY < 450) {
    adb('shell input swipe 540 900 540 1400 320');
    sleep(700);
    return null;
  }
  return xml;
}

export function tapAfterNeedle(xml, needle, linkText) {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escLink = linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const idx = xml.search(new RegExp(esc, 'i'));
  if (idx < 0) return false;
  const slice = xml.slice(idx, idx + 12000);
  const m = new RegExp(`text="${escLink}[^"]*"[^>]*bounds="(\\[[^\\]]+\\]\\[[^\\]]+\\])"`).exec(slice);
  if (!m) return false;
  const c = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(m[1]);
  return { x: ((+c[1] + +c[3]) / 2) | 0, y: ((+c[2] + +c[4]) / 2) | 0 };
}

export function revealAndTapFixtureResults(adb, dumpUi, sleep, quizTitle, maxScrolls = 14) {
  let xml = dumpUi();
  const attempts = [];
  for (let i = 0; i < maxScrolls; i += 1) {
    let target = findFixtureResultsTapTarget(xml, quizTitle);
    if (target.found) {
      const { x1, y1, x2, y2 } = target.bounds;
      adb(`shell input tap ${(x1 + x2) / 2 | 0} ${(y1 + y2) / 2 | 0}`);
      return { tapped: true, xml, attempts, via: 'results_bounds' };
    }
    const needleTap = tapAfterNeedle(xml, quizTitle, 'Results');
    if (needleTap) {
      adb(`shell input tap ${needleTap.x} ${needleTap.y}`);
      return { tapped: true, xml, attempts, via: 'tap_after_title' };
    }
    if (!xml.includes(quizTitle)) {
      adb('shell input swipe 540 900 540 1400 320');
      attempts.push({ scroll: i, direction: 'down_seek_title' });
    } else {
      adb('shell input swipe 540 1450 540 850 320');
      attempts.push({ scroll: i, direction: 'up_reveal_footer' });
    }
    sleep(650);
    xml = dumpUi();
  }
  return { tapped: false, xml, attempts, reason: 'results_control_never_exposed' };
}

export function tapFixtureViewResults(adb, xml, quizTitle) {
  const target = findFixtureResultsTapTarget(xml, quizTitle);
  if (!target.found) {
    return { tapped: false, reason: target.reason || 'no_results_button_near_title' };
  }
  const { x1, y1, x2, y2 } = target.bounds;
  adb(`shell input tap ${(x1 + x2) / 2 | 0} ${(y1 + y2) / 2 | 0}`);
  return { tapped: true, bounds: target.bounds };
}

/**
 * @returns {{ xml, traversal, fixtureDiscovery }}
 */
export function traverseCompletedTab({
  dumpUi,
  adb,
  sleep,
  quizTitle,
  tapLoadMore,
  maxLoadMoreTaps = 12,
}) {
  const traversal = {
    snapshots: [],
    loadMoreActions: [],
    titlesSeen: new Set(),
  };
  let xml = dumpUi();
  let fixtureDiscovery = discoverFixtureIdentity(xml, quizTitle);
  const completedTotal = parseCompletedTabTotal(xml);
  let dataState = parseAssessmentsDataState(xml);
  traversal.snapshots.push({
    phase: 'initial',
    filtered: dataState?.filtered,
    tab: dataState?.tab,
    completedTabTotal: completedTotal,
    loadMoreRemaining: parseLoadMoreRemaining(xml),
    fixture: fixtureDiscovery,
  });

  let loadMoreTaps = 0;
  const maxTaps =
    maxLoadMoreTaps ||
    Math.max(3, Math.ceil((completedTotal || 23) / 10) + 2);

  while (!fixtureDiscovery.found && loadMoreTaps < maxTaps) {
    for (const t of collectQuizTitlesFromXml(xml)) traversal.titlesSeen.add(t);
    if (!hasLoadMoreControl(xml)) break;
    const beforeRemaining = parseLoadMoreRemaining(xml);
    const beforeFiltered = parseAssessmentsDataState(xml)?.filtered;
    const tapped = tapLoadMore ? tapLoadMore(xml) : tapTestId(adb, xml, 'assessments-load-more');
    if (!tapped) break;
    loadMoreTaps += 1;
    sleep(3500);
    xml = dumpUi();
    const afterRemaining = parseLoadMoreRemaining(xml);
    const afterFiltered = parseAssessmentsDataState(xml)?.filtered;
    const progress =
      beforeRemaining !== afterRemaining ||
      beforeFiltered !== afterFiltered ||
      !hasLoadMoreControl(xml);
    traversal.loadMoreActions.push({
      tap: loadMoreTaps,
      beforeRemaining,
      afterRemaining,
      beforeFiltered,
      afterFiltered,
      progressObserved: progress,
    });
    if (!progress) {
      traversal.loadMoreStalled = true;
      break;
    }
    fixtureDiscovery = discoverFixtureIdentity(xml, quizTitle);
    traversal.snapshots.push({
      phase: `after_load_more_${loadMoreTaps}`,
      loadMoreRemaining: afterRemaining,
      filtered: afterFiltered,
      fixture: fixtureDiscovery,
    });
    if (fixtureDiscovery.found) break;
  }

  if (!fixtureDiscovery.found) {
    for (let i = 0; i < 8 && !fixtureDiscovery.found; i += 1) {
      adb('shell input swipe 540 1500 540 650 280');
      sleep(550);
      xml = dumpUi();
      for (const t of collectQuizTitlesFromXml(xml)) traversal.titlesSeen.add(t);
      fixtureDiscovery = discoverFixtureIdentity(xml, quizTitle);
    }
  }

  traversal.titlesSeen = [...traversal.titlesSeen];
  return { xml, traversal, fixtureDiscovery };
}

export function assertResultsScreen(xml) {
  const onResultsRoute = /quiz-result-summary|Quiz Results|Your answers/i.test(xml);
  const summary = /quiz-result-summary[^"]*quiz-479[^"]*attempt-207[^"]*student-70/i.test(xml);
  const score = onResultsRoute && /60%/.test(xml);
  const evaluated = onResultsRoute && /6\/10|6 of 10/i.test(xml);
  const rateLimited =
    /Could not load your submitted answers|rate limit|429|try again later/i.test(xml) &&
    !summary;
  return {
    summary,
    score,
    evaluated,
    rateLimited,
    pass: summary && score && evaluated && !rateLimited,
  };
}

export function probeSearchScope(xml, quizTitle, searchToken, fillSearch) {
  if (!fillSearch) return { attempted: false };
  const before = xml;
  fillSearch(searchToken);
  return {
    attempted: true,
    note: 'search_applies_to_loaded/filtered_set_not_guaranteed_full_history',
    beforeHadTitle: before.includes(quizTitle),
  };
}
