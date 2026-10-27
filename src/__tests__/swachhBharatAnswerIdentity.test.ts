/**
 * Mandatory regression: Swachh Bharat Abhiyan option identity (Issues 4–5).
 */
import {
  computeLocalQuizResults,
  explanationAgreesWithVerifiedKey,
  isOptionTheCorrectAnswer,
  isOptionTheUserAnswer,
  isQuizAnswerCorrect,
  normalizeDocumentQuizQuestions,
  reconcileResultsWithExplanations,
  withAuthoritativeCorrectAnswer,
} from '../core/utils/answerMappingUtils';
import { buildAttemptAnswerIdentity } from '../core/utils/attemptAnswerIdentity';

const QUESTION_TEXT =
  'In the matching activity, which description is paired with Swachh Bharat Abhiyan?';

const OPTIONS = [
  'the digital literacy campaign launched in 2015',
  'the cleanliness campaign launched on 2 October 2014',
  'the rural employment scheme launched in 2005',
  'the girl-child education campaign launched in 2015',
];

describe('Swachh Bharat Abhiyan answer identity (Issues 4–5)', () => {
  const baseQuestion = {
    id: 'swachh-1',
    question: QUESTION_TEXT,
    options: [...OPTIONS],
    correctAnswer: 'B',
    answer: 'B',
  };

  it('Case A: select A — A stays selected, B marked correct, explanation agrees with B', async () => {
    const [q] = normalizeDocumentQuizQuestions([baseQuestion], false);
    expect(q.correctOptionIndex).toBe(1);
    expect(isQuizAnswerCorrect(OPTIONS[0], q)).toBe(false);
    expect(isOptionTheUserAnswer(OPTIONS[0], OPTIONS[0], q.options, 0)).toBe(true);
    expect(isOptionTheCorrectAnswer(OPTIONS[1], q, 1)).toBe(true);
    expect(isOptionTheCorrectAnswer(OPTIONS[2], q, 2)).toBe(false);

    const local = computeLocalQuizResults([q], { 0: OPTIONS[0] });
    expect(local.questionResults[0]).toBe(false);

    const reconciled = await reconcileResultsWithExplanations(
      [q],
      { 0: OPTIONS[0] },
      async () => ({
        // Contradictory explanation claiming C — must not regrade or mark C correct.
        correct_answer: OPTIONS[2],
      }),
    );
    expect(reconciled.questionResults[0]).toBe(false);
    expect(reconciled.authoritativeCorrectAnswers[0]).toBeUndefined();
    expect(explanationAgreesWithVerifiedKey(q, OPTIONS[2])).toBe(false);
    expect(explanationAgreesWithVerifiedKey(q, OPTIONS[1])).toBe(true);

    const snapshot = buildAttemptAnswerIdentity([q], { 0: OPTIONS[0] });
    expect(snapshot.questions[0].selected?.displayIndex).toBe(0);
    expect(snapshot.questions[0].correct?.displayIndex).toBe(1);
    expect(snapshot.questions[0].isCorrect).toBe(false);
  });

  it('Case B: select B — graded correct and explanation agrees', async () => {
    const [q] = normalizeDocumentQuizQuestions([baseQuestion], false);
    expect(isQuizAnswerCorrect(OPTIONS[1], q)).toBe(true);

    const reconciled = await reconcileResultsWithExplanations(
      [q],
      { 0: OPTIONS[1] },
      async () => ({ correct_answer: OPTIONS[1] }),
    );
    expect(reconciled.questionResults[0]).toBe(true);
    expect(reconciled.authoritativeCorrectAnswers[0]).toBe(OPTIONS[1]);
  });

  it('Case C: shuffled display order preserves selection and correct identity', () => {
    const [q] = normalizeDocumentQuizQuestions([baseQuestion], true);
    expect(typeof q.correctOptionIndex).toBe('number');
    const correctText = q.options[q.correctOptionIndex!];
    expect(isQuizAnswerCorrect(correctText, q)).toBe(true);

    const wrongIdx = q.options.findIndex((_, i) => i !== q.correctOptionIndex);
    const wrongText = q.options[wrongIdx];
    expect(isQuizAnswerCorrect(wrongText, q)).toBe(false);

    const snap = buildAttemptAnswerIdentity([q], { 0: wrongText });
    expect(snap.questions[0].selected?.displayText).toBe(wrongText);
    expect(snap.questions[0].correct?.displayIndex).toBe(q.correctOptionIndex);
    expect(snap.questions[0].isCorrect).toBe(false);
  });

  it('withAuthoritativeCorrectAnswer updates correctOptionIndex with the text', () => {
    const [q] = normalizeDocumentQuizQuestions([baseQuestion], false);
    // Simulate stale index pointing at C while text says B (historical bug shape).
    const stale = { ...q, correctOptionIndex: 2 as number };
    const fixed = withAuthoritativeCorrectAnswer(stale, OPTIONS[1]);
    expect(fixed.correctOptionIndex).toBe(1);
    expect(isOptionTheCorrectAnswer(OPTIONS[1], fixed, 1)).toBe(true);
    expect(isOptionTheCorrectAnswer(OPTIONS[2], fixed, 2)).toBe(false);
  });
});
