/**
 * Quiz answer mapping — mirrors Quiz-React answerMappingUtils.
 * Grading uses stable display indices; text normalization is only for legacy letter resolution.
 */

import {
  permuteOptions,
  resolveCorrectOptionIndex,
  resolveSelectedOptionIndex,
  shuffleOptionOrder,
  type OptionPermutation,
} from './optionIdentity';

export type LetterOption = 'A' | 'B' | 'C' | 'D';

export const normalizeComparableOptionValue = (value: string): string =>
  String(value || '')
    .trim()
    .replace(/\\\((.*?)\\\)/g, '$1')
    .replace(/\\\[(.*?)\\\]/g, '$1')
    .replace(/^\$+|\$+$/g, '')
    .replace(/^[A-Da-d]\.\.?\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const indexToLetter = (index: number): LetterOption =>
  String.fromCharCode(65 + index) as LetterOption;

export const letterToIndex = (letter: LetterOption): number =>
  letter.charCodeAt(0) - 65;

export const letterToOptionString = (letter: LetterOption, options: string[]): string => {
  const index = letterToIndex(letter);
  return options[index] || '';
};

export const optionStringToLetter = (
  optionString: string,
  options: string[],
): LetterOption | null => {
  const target = normalizeComparableOptionValue(optionString);
  const index = options.findIndex(
    (option) => normalizeComparableOptionValue(option) === target,
  );
  return index !== -1 ? indexToLetter(index) : null;
};

export const normalizeSelectedAnswer = (
  selectedAnswer: string,
  options: string[],
): string => {
  if (selectedAnswer.length === 1 && /^[A-D]$/i.test(selectedAnswer)) {
    return letterToOptionString(selectedAnswer.toUpperCase() as LetterOption, options);
  }
  const trimmedAnswer = selectedAnswer.trim();
  const matchingOption = options.find(
    (option) => normalizeComparableOptionValue(option) === normalizeComparableOptionValue(trimmedAnswer),
  );
  return matchingOption || selectedAnswer;
};

export const getCorrectOptionFromLetter = (
  correctAnswerLetter: string,
  options: string[],
): string => {
  if (correctAnswerLetter.length === 1 && /^[A-D]$/i.test(correctAnswerLetter)) {
    return letterToOptionString(correctAnswerLetter.toUpperCase() as LetterOption, options);
  }
  const matched = options.find(
    (option) =>
      normalizeComparableOptionValue(option) ===
      normalizeComparableOptionValue(correctAnswerLetter),
  );
  return matched || correctAnswerLetter;
};

export const shuffleQuizOptions = (
  options: string[],
  correctAnswerLetter: string,
  random: () => number = Math.random,
): {
  shuffledOptions: string[];
  newCorrectAnswer: LetterOption;
  optionOrder: OptionPermutation;
  correctOptionIndex: number;
} => {
  const correctOriginalIndex = resolveCorrectOptionIndex(correctAnswerLetter, options);
  if (correctOriginalIndex == null) {
    throw new Error('CORRECT_OPTION_NOT_FOUND_AFTER_SHUFFLE');
  }
  const optionOrder = shuffleOptionOrder(options.length, correctOriginalIndex, random);
  const shuffledOptions = permuteOptions(options, optionOrder);
  const correctOptionIndex = optionOrder.indexOf(correctOriginalIndex);
  return {
    shuffledOptions,
    newCorrectAnswer: indexToLetter(correctOptionIndex),
    optionOrder,
    correctOptionIndex,
  };
};

/** Strip embedded "A. "/"B. " prefixes the API sometimes includes in option text. */
export const stripOptionLabel = (opt: string): string =>
  opt.replace(/^[A-Da-d]\.\.?\s*/, '').trim();

export const resolveCorrectAnswerLetter = (
  rawCorrect: string,
  options: string[],
): LetterOption | null => {
  const idx = resolveCorrectOptionIndex(rawCorrect, options);
  return idx == null ? null : indexToLetter(idx);
};

export const getQuestionCorrectOptionText = (question: {
  options: string[];
  correctAnswer?: string;
  answer?: string;
}): string => {
  const raw = (question.correctAnswer || question.answer || '').trim();
  return getCorrectOptionFromLetter(raw, question.options);
};

export const isQuizAnswerCorrect = (
  selectedAnswer: string | undefined,
  question: {
    options: string[];
    correctAnswer?: string;
    answer?: string;
    correctOptionIndex?: number;
  },
): boolean => {
  if (!selectedAnswer) return false;
  if (typeof question.correctOptionIndex === 'number') {
    const selectedIdx = resolveSelectedOptionIndex(selectedAnswer, question.options);
    if (selectedIdx == null) return false;
    return selectedIdx === question.correctOptionIndex;
  }
  const rawCorrect = String(question.correctAnswer ?? question.answer ?? '').trim();
  const correctIdx = resolveCorrectOptionIndex(rawCorrect, question.options);
  const selectedIdx = resolveSelectedOptionIndex(selectedAnswer, question.options);
  if (correctIdx == null || selectedIdx == null) return false;
  return selectedIdx === correctIdx;
};

export const isOptionTheCorrectAnswer = (
  option: string,
  question: {
    options: string[];
    correctAnswer?: string;
    answer?: string;
    correctOptionIndex?: number;
  },
  optionIndex?: number,
): boolean => {
  if (
    typeof question.correctOptionIndex === 'number' &&
    typeof optionIndex === 'number'
  ) {
    return optionIndex === question.correctOptionIndex;
  }
  if (typeof question.correctOptionIndex === 'number') {
    const idx = resolveSelectedOptionIndex(option, question.options);
    return idx != null && idx === question.correctOptionIndex;
  }
  return (
    normalizeComparableOptionValue(option) ===
    normalizeComparableOptionValue(getQuestionCorrectOptionText(question))
  );
};

export const isOptionTheUserAnswer = (
  option: string,
  userAnswer: string,
  options: string[],
  optionIndex?: number,
): boolean => {
  if (!userAnswer) return false;
  if (typeof optionIndex === 'number') {
    const selectedIdx = resolveSelectedOptionIndex(userAnswer, options);
    if (selectedIdx != null) return selectedIdx === optionIndex;
  }
  const normalizedUser = normalizeSelectedAnswer(userAnswer, options);
  return normalizeComparableOptionValue(option) === normalizeComparableOptionValue(normalizedUser);
};

export type PlayableQuizQuestion = {
  id?: string;
  question: string;
  options: string[];
  correctAnswer?: string;
  answer?: string;
  explanation?: string | null;
  optionsNormalized?: boolean;
  /** Display-order index used for grading after normalization/shuffle. */
  correctOptionIndex?: number;
  /** Maps display index → original API option index (for submit). */
  optionOrder?: OptionPermutation;
  /** Original API option texts before shuffle (when optionOrder is set). */
  originalOptions?: string[];
  /** Authoritative correctness from attended-quiz when answer key is absent. */
  attendedIsCorrect?: boolean | null;
  /** When true, explanation reconciliation must not change grading. */
  gradingFrozen?: boolean;
};

export function hasAuthoritativeCorrectAnswer(question: {
  correctAnswer?: string;
  answer?: string;
}): boolean {
  return Boolean(String(question.correctAnswer ?? question.answer ?? '').trim());
}

/**
 * Grades a persisted answer: uses answer key when present, else attended is_correct metadata.
 * Returns null when correctness is unknown (do not count as incorrect).
 */
export function evaluatePersistedAnswerCorrectness(
  selectedAnswer: string | undefined,
  question: PlayableQuizQuestion,
): boolean | null {
  if (!selectedAnswer || !String(selectedAnswer).trim()) {
    return false;
  }
  if (hasAuthoritativeCorrectAnswer(question)) {
    return isQuizAnswerCorrect(selectedAnswer, question);
  }
  if (typeof question.attendedIsCorrect === 'boolean') {
    return question.attendedIsCorrect;
  }
  return null;
}

/**
 * Normalize quiz questions for play — mirrors web HandwrittenWorkspace.normalizeDocumentQuizQuestions.
 * Stores correctAnswer as full option text after optional shuffle.
 */
export const normalizeDocumentQuizQuestions = (
  questions: PlayableQuizQuestion[],
  shuffleAnswerOptions = true,
): PlayableQuizQuestion[] =>
  (questions || []).map((q, idx) => {
    if (q.optionsNormalized && typeof q.correctOptionIndex === 'number' && (q.options?.length ?? 0) > 0) {
      return { ...q, id: q.id || `q-${idx}` };
    }
    const baseOptions = (q.options || []).map((opt) => stripOptionLabel(String(opt ?? '')));
    const rawCorrect = String(q.correctAnswer ?? q.answer ?? '').trim();
    const correctOptionIndex = resolveCorrectOptionIndex(rawCorrect, baseOptions);
    if (correctOptionIndex == null) {
      return {
        ...q,
        id: q.id || `q-${idx}`,
        options: baseOptions,
        correctAnswer: '',
        answer: '',
        optionsNormalized: false,
      };
    }

    if (!shuffleAnswerOptions) {
      const correctOptionText = baseOptions[correctOptionIndex] || rawCorrect;
      return {
        ...q,
        id: q.id || `q-${idx}`,
        options: baseOptions,
        correctAnswer: correctOptionText,
        answer: correctOptionText,
        correctOptionIndex,
        optionsNormalized: true,
      };
    }

    const { shuffledOptions, correctOptionIndex: displayCorrectIndex, optionOrder } =
      shuffleQuizOptions(baseOptions, rawCorrect);
    const correctOptionText = shuffledOptions[displayCorrectIndex] || rawCorrect;

    return {
      ...q,
      id: q.id || `q-${idx}`,
      options: shuffledOptions,
      originalOptions: baseOptions,
      optionOrder,
      correctAnswer: correctOptionText,
      answer: correctOptionText,
      correctOptionIndex: displayCorrectIndex,
      optionsNormalized: true,
    };
  });

export const withAuthoritativeCorrectAnswer = (
  question: PlayableQuizQuestion,
  authoritativeText?: string,
): PlayableQuizQuestion => {
  if (!authoritativeText?.trim()) return question;
  const resolved = normalizeSelectedAnswer(authoritativeText, question.options);
  const correctOptionIndex = resolveCorrectOptionIndex(resolved, question.options);
  if (correctOptionIndex == null) {
    // Ambiguous / unverifiable — do not silently rewrite the answer key.
    return question;
  }
  return {
    ...question,
    correctAnswer: question.options[correctOptionIndex] ?? resolved,
    answer: question.options[correctOptionIndex] ?? resolved,
    correctOptionIndex,
  };
};

/**
 * True when an explanation API correct_answer agrees with the verified quiz key.
 * Contradictory explanation content must be quarantined, not used for grading/UI.
 */
export function explanationAgreesWithVerifiedKey(
  question: PlayableQuizQuestion,
  explanationCorrectAnswer?: string,
): boolean {
  const apiText = String(explanationCorrectAnswer ?? '').trim();
  if (!apiText) return false;
  if (typeof question.correctOptionIndex === 'number') {
    const apiIdx = resolveCorrectOptionIndex(apiText, question.options);
    return apiIdx != null && apiIdx === question.correctOptionIndex;
  }
  if (!hasAuthoritativeCorrectAnswer(question)) return false;
  const keyIdx = resolveCorrectOptionIndex(
    String(question.correctAnswer ?? question.answer ?? ''),
    question.options,
  );
  const apiIdx = resolveCorrectOptionIndex(apiText, question.options);
  return keyIdx != null && apiIdx != null && keyIdx === apiIdx;
}

export interface ExplanationReconcileInput {
  questionId: string;
  questionText: string;
  options: string[];
  selectedAnswer: string;
}

export interface ExplanationReconcileResult {
  authoritativeCorrectAnswers: Record<number, string>;
  questionResults: Record<number, boolean>;
}

/** Local grading only — safe to run before persistence (no explanation API). */
export function computeLocalQuizResults(
  questions: PlayableQuizQuestion[],
  selectedAnswers: Record<number, string>,
): ExplanationReconcileResult {
  const authoritativeCorrectAnswers: Record<number, string> = {};
  const questionResults: Record<number, boolean> = {};

  questions.forEach((question, index) => {
    const selectedAnswer = selectedAnswers[index];
    if (!selectedAnswer) {
      questionResults[index] = false;
      return;
    }
    questionResults[index] = isQuizAnswerCorrect(selectedAnswer, question);
  });

  return { authoritativeCorrectAnswers, questionResults };
}

/**
 * Reconcile results with explanation API for display enrichment only.
 * Verified quiz answer keys and frozen grades are never rewritten by explanations.
 * Contradictory explanation correct_answer values are quarantined (omitted).
 */
export const reconcileResultsWithExplanations = async (
  questions: PlayableQuizQuestion[],
  selectedAnswers: Record<number, string>,
  fetchExplanation: (payload: ExplanationReconcileInput) => Promise<{ correct_answer?: string }>,
): Promise<ExplanationReconcileResult> => {
  const local = computeLocalQuizResults(questions, selectedAnswers);
  const authoritativeCorrectAnswers: Record<number, string> = {
    ...local.authoritativeCorrectAnswers,
  };
  const questionResults: Record<number, boolean> = { ...local.questionResults };

  await Promise.all(
    questions.map(async (question, index) => {
      const selectedAnswer = selectedAnswers[index];
      if (!selectedAnswer) {
        questionResults[index] = false;
        return;
      }

      // Frozen / attended grades and verified keys: never regrade from explanations.
      if (question.gradingFrozen || typeof question.attendedIsCorrect === 'boolean') {
        const persisted = evaluatePersistedAnswerCorrectness(selectedAnswer, question);
        questionResults[index] = persisted === true;
        return;
      }

      const hasVerifiedKey =
        typeof question.correctOptionIndex === 'number' ||
        hasAuthoritativeCorrectAnswer(question);

      if (hasVerifiedKey) {
        questionResults[index] = isQuizAnswerCorrect(selectedAnswer, question);
        // Optionally fetch explanation for enrichment; never override grading.
        try {
          const data = await fetchExplanation({
            questionId: question.id || `q-${index}`,
            questionText: question.question,
            options: question.options,
            selectedAnswer,
          });
          const apiCorrect = data.correct_answer?.trim();
          if (apiCorrect && explanationAgreesWithVerifiedKey(question, apiCorrect)) {
            const enriched = withAuthoritativeCorrectAnswer(question, apiCorrect);
            authoritativeCorrectAnswers[index] =
              enriched.correctAnswer || question.options[enriched.correctOptionIndex!] || apiCorrect;
          }
          // Contradictory explanation correct_answer is quarantined (not stored).
        } catch {
          // Explanation failures are tolerable.
        }
        return;
      }

      // No verified key: explanation may supply a unique resolvable answer for display,
      // but ambiguous resolutions must not invent a grade.
      try {
        const data = await fetchExplanation({
          questionId: question.id || `q-${index}`,
          questionText: question.question,
          options: question.options,
          selectedAnswer,
        });
        const apiCorrect = data.correct_answer?.trim();
        if (apiCorrect) {
          const enriched = withAuthoritativeCorrectAnswer(question, apiCorrect);
          if (typeof enriched.correctOptionIndex === 'number') {
            authoritativeCorrectAnswers[index] =
              enriched.correctAnswer || question.options[enriched.correctOptionIndex];
            questionResults[index] = isQuizAnswerCorrect(selectedAnswer, enriched);
            return;
          }
        }
      } catch {
        // Fall through to local grading.
      }

      questionResults[index] = isQuizAnswerCorrect(selectedAnswer, question);
    }),
  );

  return { authoritativeCorrectAnswers, questionResults };
};
