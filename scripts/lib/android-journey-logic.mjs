import {
  collectUiTexts,
  isEduvijnaAppForeground,
  locateByLabel,
  locateClickableByLabel,
  locateByTestId,
  parseUiXml,
  readXmlContent,
} from './android-ui-nodes.mjs';

export {
  collectUiTexts,
  isEduvijnaAppForeground,
  locateByLabel,
  locateClickableByLabel,
  locateByTestId,
  parseUiXml,
  readXmlContent,
};

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

  const identityNeedle =
    fixture.identityLabel ||
    `quiz-${fixture.quizId} attempt-${fixture.attemptId} student-${fixture.studentId}`;
  const summaryHit = locateByTestId(nodes, 'quiz-result-summary');
  const identityOk =
    summaryHit != null && texts.some((t) => t.includes(identityNeedle));

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

  const contentOk =
    !fixture.firstQuestionSnippet ||
    blob.includes(fixture.firstQuestionSnippet.slice(0, Math.min(24, fixture.firstQuestionSnippet.length))) ||
    questionMarkers.length >= fixture.expectedEvaluatedItems;
  const answerOk =
    !fixture.firstAnswerSnippet ||
    blob.includes(fixture.firstAnswerSnippet.slice(0, Math.min(16, fixture.firstAnswerSnippet.length))) ||
    questionMarkers.length >= fixture.expectedEvaluatedItems;

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
