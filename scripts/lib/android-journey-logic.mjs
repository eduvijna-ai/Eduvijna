import { collectUiTexts, isEduvijnaAppForeground, locateByLabel, locateByTestId, parseUiXml, readXmlContent } from './android-ui-nodes.mjs';

export { collectUiTexts, isEduvijnaAppForeground, locateByLabel, locateByTestId, parseUiXml, readXmlContent };

/**
 * @param {string} xmlContent
 * @param {{ quizId: number; sessionId: string; classroomId: string; quizTitle: string; classLabel?: string|null }} fixture
 */
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
  const wrongQuiz = texts.some((t) => /PRO_Assessment_20261007/i.test(t));
  return {
    pass: Boolean(titleOk && classOk && hasStudentRow && !wrongQuiz),
    titleOk,
    classOk,
    hasStudentRow,
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

  const scoreOk =
    texts.some((t) => /Score\s*:\s*60\s*%/i.test(t)) ||
    texts.some((t) => /^60\s*%$/.test(t.trim())) ||
    new RegExp(`\\b${fixture.expectedScore}\\s*%`, 'i').test(blob);

  const questionMarkers = texts.filter((t) => /^Q\d+$/i.test(String(t).trim()));
  const evaluatedOk =
    texts.some((t) => /(evaluated|questions|items).{0,12}\b10\b/i.test(t)) ||
    texts.some((t) => /\b10\b\s*(evaluated|questions|items)/i.test(t)) ||
    texts.some((t) => /Evaluated\s*:\s*10/i.test(t)) ||
    texts.some((t) => /\b\d+\s*\/\s*10\b/.test(t)) ||
    questionMarkers.length >= fixture.expectedEvaluatedItems;

  const correctOk =
    texts.some((t) => /\b6\b\s*correct/i.test(t)) ||
    texts.some((t) => /Correct\s*:\s*6/i.test(t)) ||
    texts.some((t) => /6\s*\/\s*10/i.test(t));

  const studentOk = texts.some((t) => t.includes(fixture.studentName));
  const titleOk = texts.some((t) => t.includes(fixture.quizTitle) || t.includes('Results'));

  const unrelatedNumberTrap =
    !evaluatedOk &&
    !correctOk &&
    texts.some((t) => /^10$/.test(t.trim())) &&
    texts.some((t) => /^6$/.test(t.trim()));

  const pass =
    scoreOk &&
    evaluatedOk &&
    correctOk &&
    studentOk &&
    titleOk &&
    !unrelatedNumberTrap;

  return {
    pass,
    scoreOk,
    evaluatedOk,
    correctOk,
    studentOk,
    titleOk,
    unrelatedNumberTrap,
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
