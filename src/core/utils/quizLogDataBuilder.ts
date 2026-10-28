import { type PlayableQuizQuestion } from './answerMappingUtils';
import {
  buildAttemptAnswerIdentity,
  selectedDisplayLetter,
  type AttemptAnswerIdentityV1,
} from './attemptAnswerIdentity';

export interface QuizSubmissionAnswerLogEntry {
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string | null;
  /** Display text selected by the student (authoritative for reopen). */
  userAnswerText: string | null;
  selectedDisplayIndex: number | null;
  correctDisplayIndex: number | null;
  isCorrect: boolean | null;
}

export function buildAssignedQuizLogData(params: {
  questions: PlayableQuizQuestion[];
  selectedAnswers: Record<number, string>;
  questionCount: number;
  timeSpentSeconds: number;
  attemptId: number;
  scorePercent?: number;
  questionResults?: Record<number, boolean>;
  /** Display indices from the taking UI — required when option text is duplicated. */
  selectedDisplayIndices?: Record<number, number>;
}): Record<string, unknown> {
  const {
    questions,
    selectedAnswers,
    questionCount,
    timeSpentSeconds,
    attemptId,
    scorePercent,
    questionResults,
    selectedDisplayIndices,
  } = params;

  const answerIdentity: AttemptAnswerIdentityV1 = buildAttemptAnswerIdentity(
    questions,
    selectedAnswers,
    String(attemptId),
    selectedDisplayIndices,
  );

  const answers: QuizSubmissionAnswerLogEntry[] = answerIdentity.questions.map((snap, index) => {
    const question = questions[index];
    const letter = selectedDisplayLetter(snap);
    const correctRaw = question?.correctAnswer ?? question?.answer ?? '';
    const isCorrectFromIdentity = snap.isCorrect;
    const isCorrect =
      questionResults && Object.prototype.hasOwnProperty.call(questionResults, index)
        ? Boolean(questionResults[index])
        : isCorrectFromIdentity === null
          ? null
          : isCorrectFromIdentity;

    return {
      questionNumber: index + 1,
      question: snap.questionText,
      options: snap.optionsDisplayed,
      correctAnswer: correctRaw,
      userAnswer: letter,
      userAnswerText: snap.selected?.displayText ?? null,
      selectedDisplayIndex: snap.selected?.displayIndex ?? null,
      correctDisplayIndex: snap.correct?.displayIndex ?? null,
      isCorrect,
    };
  });

  return {
    answers,
    answer_identity: answerIdentity,
    questionCount,
    score: scorePercent,
    time_spent_seconds: timeSpentSeconds,
    attempt_id: attemptId,
    client: { platform: 'eduvijna-mobile' },
  };
}
