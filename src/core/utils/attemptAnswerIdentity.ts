/**
 * Canonical, versioned question/answer identity for quiz attempts.
 * Submission, grading, review and explanations must share this contract.
 */

import {
  indexToLetter,
  isQuizAnswerCorrect,
  type PlayableQuizQuestion,
} from './answerMappingUtils';
import {
  resolveCorrectOptionIndex,
  resolveSelectedOptionIndex,
  type OptionPermutation,
} from './optionIdentity';

export const ATTEMPT_ANSWER_IDENTITY_VERSION = 1 as const;

export type AttemptOptionIdentity = {
  /** Stable original-index identity (pre-shuffle). */
  originalIndex: number;
  /** Index in the displayed option list. */
  displayIndex: number;
  /** Option text as shown to the student. */
  displayText: string;
};

export type AttemptQuestionSnapshot = {
  questionId: string;
  questionText: string;
  optionsDisplayed: string[];
  /** displayIndex → originalIndex when shuffled; identity map otherwise. */
  optionOrder?: OptionPermutation;
  originalOptions?: string[];
  correct: AttemptOptionIdentity | null;
  selected: AttemptOptionIdentity | null;
  isCorrect: boolean | null;
};

export type AttemptAnswerIdentityV1 = {
  version: typeof ATTEMPT_ANSWER_IDENTITY_VERSION;
  attemptId?: string;
  questions: AttemptQuestionSnapshot[];
};

function isValidOptionIdentity(value: unknown, optionCount: number): boolean {
  if (value == null) return true;
  if (!value || typeof value !== 'object') return false;
  const row = value as AttemptOptionIdentity;
  return (
    typeof row.displayIndex === 'number' &&
    row.displayIndex >= 0 &&
    row.displayIndex < optionCount &&
    typeof row.originalIndex === 'number' &&
    typeof row.displayText === 'string'
  );
}

function isValidQuestionSnapshot(value: unknown): value is AttemptQuestionSnapshot {
  if (!value || typeof value !== 'object') return false;
  const row = value as AttemptQuestionSnapshot;
  if (typeof row.questionId !== 'string' || typeof row.questionText !== 'string') return false;
  if (!Array.isArray(row.optionsDisplayed) || row.optionsDisplayed.length === 0) return false;
  if (!row.optionsDisplayed.every((o) => typeof o === 'string')) return false;
  const n = row.optionsDisplayed.length;
  if (!isValidOptionIdentity(row.correct, n)) return false;
  if (!isValidOptionIdentity(row.selected, n)) return false;
  if (!(row.isCorrect === true || row.isCorrect === false || row.isCorrect === null)) return false;
  return true;
}

export function isAttemptAnswerIdentityV1(value: unknown): value is AttemptAnswerIdentityV1 {
  if (!value || typeof value !== 'object') return false;
  const row = value as AttemptAnswerIdentityV1;
  if (row.version !== ATTEMPT_ANSWER_IDENTITY_VERSION || !Array.isArray(row.questions)) {
    return false;
  }
  if (row.questions.length === 0) return false;
  return row.questions.every(isValidQuestionSnapshot);
}

/** True when identity question count matches attended/log question count. */
export function isAnswerIdentityAligned(
  identity: AttemptAnswerIdentityV1,
  expectedQuestionCount: number,
): boolean {
  return (
    expectedQuestionCount > 0 &&
    identity.questions.length === expectedQuestionCount
  );
}

/** Rebuild display selected-answer strings from a frozen identity (reopen/review). */
export function selectedAnswersFromIdentity(
  identity: AttemptAnswerIdentityV1,
): Record<number, string> {
  const out: Record<number, string> = {};
  identity.questions.forEach((q, index) => {
    if (q.selected?.displayText) {
      out[index] = q.selected.displayText;
    }
  });
  return out;
}

/** Rebuild userAnswers array aligned to question order for QuizResultsScreen. */
export function userAnswersArrayFromIdentity(identity: AttemptAnswerIdentityV1): string[] {
  return identity.questions.map((q) => q.selected?.displayText ?? '');
}

function buildOptionIdentity(
  displayIndex: number,
  optionsDisplayed: string[],
  optionOrder?: OptionPermutation,
): AttemptOptionIdentity | null {
  if (displayIndex < 0 || displayIndex >= optionsDisplayed.length) return null;
  const originalIndex =
    optionOrder && optionOrder[displayIndex] != null
      ? optionOrder[displayIndex]
      : displayIndex;
  return {
    originalIndex,
    displayIndex,
    displayText: optionsDisplayed[displayIndex],
  };
}

/** Freeze a playable question + selection into an immutable attempt snapshot. */
export function freezeAttemptQuestionSnapshot(
  question: PlayableQuizQuestion,
  selectedAnswer: string | undefined,
  questionIndex: number,
  selectedDisplayIndexHint?: number | null,
): AttemptQuestionSnapshot {
  const optionsDisplayed = question.options || [];
  const correctDisplayIndex =
    typeof question.correctOptionIndex === 'number'
      ? question.correctOptionIndex
      : resolveCorrectOptionIndex(
          String(question.correctAnswer ?? question.answer ?? ''),
          optionsDisplayed,
        );
  const hinted =
    typeof selectedDisplayIndexHint === 'number' &&
    selectedDisplayIndexHint >= 0 &&
    selectedDisplayIndexHint < optionsDisplayed.length
      ? selectedDisplayIndexHint
      : null;
  const selectedDisplayIndex =
    hinted != null
      ? hinted
      : selectedAnswer
        ? resolveSelectedOptionIndex(selectedAnswer, optionsDisplayed)
        : null;

  const correct =
    correctDisplayIndex == null
      ? null
      : buildOptionIdentity(correctDisplayIndex, optionsDisplayed, question.optionOrder);
  const selected =
    selectedDisplayIndex == null
      ? null
      : buildOptionIdentity(selectedDisplayIndex, optionsDisplayed, question.optionOrder);

  let isCorrect: boolean | null = null;
  if (selectedDisplayIndex == null && (!selectedAnswer || !String(selectedAnswer).trim())) {
    isCorrect = false;
  } else if (correct == null) {
    isCorrect = null;
  } else {
    isCorrect = isQuizAnswerCorrect(selectedAnswer, question, selectedDisplayIndex);
  }

  return {
    questionId: question.id || `q-${questionIndex}`,
    questionText: question.question,
    optionsDisplayed,
    optionOrder: question.optionOrder,
    originalOptions: question.originalOptions,
    correct,
    selected,
    isCorrect,
  };
}

export function buildAttemptAnswerIdentity(
  questions: PlayableQuizQuestion[],
  selectedAnswers: Record<number, string>,
  attemptId?: string,
  selectedDisplayIndices?: Record<number, number>,
): AttemptAnswerIdentityV1 {
  return {
    version: ATTEMPT_ANSWER_IDENTITY_VERSION,
    attemptId,
    questions: questions.map((q, i) =>
      freezeAttemptQuestionSnapshot(
        q,
        selectedAnswers[i],
        i,
        selectedDisplayIndices?.[i],
      ),
    ),
  };
}

/** API letter contract without losing display identity. */
export function selectedDisplayLetter(
  snapshot: AttemptQuestionSnapshot,
): string | null {
  if (!snapshot.selected) return null;
  return indexToLetter(snapshot.selected.displayIndex);
}
