/**
 * Integration regression: Swachh Bharat — submit → persist identity → reopen → explanation quarantine.
 */
import {
  explanationAgreesWithVerifiedKey,
  normalizeDocumentQuizQuestions,
  reconcileResultsWithExplanations,
} from '../core/utils/answerMappingUtils';
import { buildAttemptAnswerIdentity } from '../core/utils/attemptAnswerIdentity';
import { buildAssignedQuizLogData } from '../core/utils/quizLogDataBuilder';
import { normalizeQuestionsAndAnswersFromLogData } from '../core/services/quizResultNormalization';

const QUESTION_TEXT =
  'In the matching activity, which description is paired with Swachh Bharat Abhiyan?';

const OPTIONS = [
  'the digital literacy campaign launched in 2015',
  'the cleanliness campaign launched on 2 October 2014',
  'the rural employment scheme launched in 2005',
  'the girl-child education campaign launched in 2015',
];

describe('Swachh Bharat submit → saved result → reopen → explanation', () => {
  it('preserves selected A / correct B through log_data identity and quarantines conflicting explanation body', async () => {
    const [q] = normalizeDocumentQuizQuestions(
      [
        {
          id: 'swachh-1',
          question: QUESTION_TEXT,
          options: [...OPTIONS],
          correctAnswer: 'B',
          answer: 'B',
        },
      ],
      false,
    );

    const selectedAnswers = { 0: OPTIONS[0] };
    const logData = buildAssignedQuizLogData({
      questions: [q],
      selectedAnswers,
      questionCount: 1,
      timeSpentSeconds: 42,
      attemptId: 901,
      scorePercent: 0,
    });

    expect(logData.answer_identity).toEqual(
      expect.objectContaining({
        version: 1,
        questions: [
          expect.objectContaining({
            selected: expect.objectContaining({ displayIndex: 0, displayText: OPTIONS[0] }),
            correct: expect.objectContaining({ displayIndex: 1, displayText: OPTIONS[1] }),
            isCorrect: false,
          }),
        ],
      }),
    );

    const answers = logData.answers as Array<Record<string, unknown>>;
    expect(answers[0].userAnswerText).toBe(OPTIONS[0]);
    expect(answers[0].userAnswer).toBe('A');
    expect(answers[0].selectedDisplayIndex).toBe(0);
    expect(answers[0].correctDisplayIndex).toBe(1);

    const reopened = normalizeQuestionsAndAnswersFromLogData(logData);
    expect(reopened).not.toBeNull();
    expect(reopened!.userAnswers[0]).toBe(OPTIONS[0]);
    expect(reopened!.questions[0].correctOptionIndex).toBe(1);
    expect(reopened!.questions[0].options[0]).toBe(OPTIONS[0]);
    expect(reopened!.questions[0].options[1]).toBe(OPTIONS[1]);

    const identity = buildAttemptAnswerIdentity(reopened!.questions, {
      0: reopened!.userAnswers[0],
    });
    expect(identity.questions[0].selected?.displayText).toBe(OPTIONS[0]);
    expect(identity.questions[0].correct?.displayIndex).toBe(1);

    const reconciled = await reconcileResultsWithExplanations(
      reopened!.questions,
      { 0: reopened!.userAnswers[0] },
      async () => ({
        correct_answer: OPTIONS[2],
        explanation: {
          correct_reason: 'WRONG REASON claiming C',
          wrong_options: { option1: 'misleading A description' },
          educational_fact: 'should not surface when quarantined',
        },
      }),
    );
    expect(reconciled.questionResults[0]).toBe(false);
    expect(reconciled.authoritativeCorrectAnswers[0]).toBeUndefined();
    expect(explanationAgreesWithVerifiedKey(reopened!.questions[0], OPTIONS[2])).toBe(false);
  });

  it('survives duplicate option text when selectedDisplayIndices are provided from the taking UI', () => {
    const [q] = normalizeDocumentQuizQuestions(
      [
        {
          id: 'dup-1',
          question: 'Pick the campaign',
          options: ['Same text', 'Same text', 'Other', 'Other2'],
          correctAnswer: 'B',
          answer: 'B',
        },
      ],
      false,
    );
    expect(q.correctOptionIndex).toBe(1);

    // Select first duplicate (wrong) vs second duplicate (correct).
    const wrongPick = buildAssignedQuizLogData({
      questions: [q],
      selectedAnswers: { 0: 'Same text' },
      selectedDisplayIndices: { 0: 0 },
      questionCount: 1,
      timeSpentSeconds: 10,
      attemptId: 7,
      scorePercent: 0,
      questionResults: { 0: false },
    });
    const rightPick = buildAssignedQuizLogData({
      questions: [q],
      selectedAnswers: { 0: 'Same text' },
      selectedDisplayIndices: { 0: 1 },
      questionCount: 1,
      timeSpentSeconds: 10,
      attemptId: 8,
      scorePercent: 100,
      questionResults: { 0: true },
    });

    const wrongIdentity = wrongPick.answer_identity as {
      questions: Array<{ selected: { displayIndex: number } | null; isCorrect: boolean | null }>;
    };
    const rightIdentity = rightPick.answer_identity as {
      questions: Array<{ selected: { displayIndex: number } | null; isCorrect: boolean | null }>;
    };
    expect(wrongIdentity.questions[0].selected?.displayIndex).toBe(0);
    expect(wrongIdentity.questions[0].isCorrect).toBe(false);
    expect(rightIdentity.questions[0].selected?.displayIndex).toBe(1);
    expect(rightIdentity.questions[0].isCorrect).toBe(true);

    const reopenedWrong = normalizeQuestionsAndAnswersFromLogData(wrongPick);
    const reopenedRight = normalizeQuestionsAndAnswersFromLogData(rightPick);
    expect(reopenedWrong!.questions[0].correctOptionIndex).toBe(1);
    expect(reopenedWrong!.questions[0].attendedIsCorrect).toBe(false);
    expect(reopenedRight!.questions[0].attendedIsCorrect).toBe(true);
  });
});
