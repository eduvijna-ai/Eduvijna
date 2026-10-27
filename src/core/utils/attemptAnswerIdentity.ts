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
): AttemptQuestionSnapshot {
  const optionsDisplayed = question.options || [];
  const correctDisplayIndex =
    typeof question.correctOptionIndex === 'number'
      ? question.correctOptionIndex
      : resolveCorrectOptionIndex(
          String(question.correctAnswer ?? question.answer ?? ''),
          optionsDisplayed,
        );
  const selectedDisplayIndex = selectedAnswer
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
  if (!selectedAnswer || !String(selectedAnswer).trim()) {
    isCorrect = false;
  } else if (correct == null) {
    isCorrect = null;
  } else {
    isCorrect = isQuizAnswerCorrect(selectedAnswer, question);
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
): AttemptAnswerIdentityV1 {
  return {
    version: ATTEMPT_ANSWER_IDENTITY_VERSION,
    attemptId,
    questions: questions.map((q, i) =>
      freezeAttemptQuestionSnapshot(q, selectedAnswers[i], i),
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
