/**
 * Quiz answer mapping — mirrors Quiz-React answerMappingUtils.
 * Maps between letters (A–D) and option text with normalized comparison.
 */

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
): { shuffledOptions: string[]; newCorrectAnswer: LetterOption } => {
  const correctAnswerText = getCorrectOptionFromLetter(correctAnswerLetter, options);
  const shuffledOptions = [...options];
  for (let i = shuffledOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
  }
  const normCorrect = normalizeComparableOptionValue(correctAnswerText);
  const newCorrectIndex = shuffledOptions.findIndex(
    (opt) => normalizeComparableOptionValue(opt) === normCorrect,
  );
  const safeIndex = newCorrectIndex === -1 ? 0 : newCorrectIndex;
  return {
    shuffledOptions,
    newCorrectAnswer: indexToLetter(safeIndex),
  };
};

/** Strip embedded "A. "/"B. " prefixes the API sometimes includes in option text. */
export const stripOptionLabel = (opt: string): string =>
  opt.replace(/^[A-Da-d]\.\.?\s*/, '').trim();

export const resolveCorrectAnswerLetter = (
  rawCorrect: string,
  options: string[],
): LetterOption => {
  const trimmed = rawCorrect.trim();
  if (/^[A-D]$/i.test(trimmed)) {
    return trimmed.toUpperCase() as LetterOption;
  }
  return (
    optionStringToLetter(trimmed, options) ||
    optionStringToLetter(stripOptionLabel(trimmed), options) ||
    'A'
  );
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
  question: { options: string[]; correctAnswer?: string; answer?: string },
): boolean => {
  if (!selectedAnswer) return false;
  const selectedText = normalizeSelectedAnswer(selectedAnswer, question.options);
  const correctText = getQuestionCorrectOptionText(question);
  return (
    normalizeComparableOptionValue(selectedText) ===
    normalizeComparableOptionValue(correctText)
  );
};

export const isOptionTheCorrectAnswer = (
  option: string,
  question: { options: string[]; correctAnswer?: string; answer?: string },
): boolean =>
  normalizeComparableOptionValue(option) ===
  normalizeComparableOptionValue(getQuestionCorrectOptionText(question));

export const isOptionTheUserAnswer = (
  option: string,
  userAnswer: string,
  options: string[],
): boolean => {
  if (!userAnswer) return false;
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
};

/**
 * Normalize quiz questions for play — mirrors web HandwrittenWorkspace.normalizeDocumentQuizQuestions.
 * Stores correctAnswer as full option text after optional shuffle.
 */
export const normalizeDocumentQuizQuestions = (
  questions: PlayableQuizQuestion[],
  shuffleAnswerOptions = true,
): PlayableQuizQuestion[] =>
  (questions || []).map((q, idx) => {
    const baseOptions = (q.options || []).map((opt) => stripOptionLabel(String(opt ?? '')));
    const rawCorrect = String(q.correctAnswer ?? q.answer ?? '').trim();
    const inferred = (
      /^[A-D]$/i.test(rawCorrect)
        ? rawCorrect.toUpperCase()
        : optionStringToLetter(rawCorrect, baseOptions) || 'A'
    ) as LetterOption;

    if (!shuffleAnswerOptions) {
      const correctOptionText = baseOptions[inferred.charCodeAt(0) - 65] || rawCorrect;
      return {
        ...q,
        id: q.id || `q-${idx}`,
        options: baseOptions,
        correctAnswer: correctOptionText,
        answer: correctOptionText,
        optionsNormalized: true,
      };
    }

    const { shuffledOptions, newCorrectAnswer } = shuffleQuizOptions(baseOptions, inferred);
    const correctOptionText =
      shuffledOptions[newCorrectAnswer.charCodeAt(0) - 65] || rawCorrect;

    return {
      ...q,
      id: q.id || `q-${idx}`,
      options: shuffledOptions,
      correctAnswer: correctOptionText,
      answer: correctOptionText,
      optionsNormalized: true,
    };
  });

export const withAuthoritativeCorrectAnswer = (
  question: PlayableQuizQuestion,
  authoritativeText?: string,
): PlayableQuizQuestion => {
  if (!authoritativeText?.trim()) return question;
  const resolved = normalizeSelectedAnswer(authoritativeText, question.options);
  return {
    ...question,
    correctAnswer: resolved,
    answer: resolved,
  };
};

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
 * Reconcile local grading with explanation API correct_answer (source of truth when generate-strict is wrong).
 */
export const reconcileResultsWithExplanations = async (
  questions: PlayableQuizQuestion[],
  selectedAnswers: Record<number, string>,
  fetchExplanation: (payload: ExplanationReconcileInput) => Promise<{ correct_answer?: string }>,
): Promise<ExplanationReconcileResult> => {
  const authoritativeCorrectAnswers: Record<number, string> = {};
  const questionResults: Record<number, boolean> = {};

  await Promise.all(
    questions.map(async (question, index) => {
      const selectedAnswer = selectedAnswers[index];
      if (!selectedAnswer) {
        questionResults[index] = false;
        return;
      }

      try {
        const data = await fetchExplanation({
          questionId: question.id || `q-${index}`,
          questionText: question.question,
          options: question.options,
          selectedAnswer,
        });
        const apiCorrect = data.correct_answer?.trim();
        if (apiCorrect) {
          const resolvedCorrect = normalizeSelectedAnswer(apiCorrect, question.options);
          authoritativeCorrectAnswers[index] = resolvedCorrect;
          questionResults[index] = isQuizAnswerCorrect(
            selectedAnswer,
            withAuthoritativeCorrectAnswer(question, resolvedCorrect),
          );
          return;
        }
      } catch {
        // Fall back to locally stored correct answer when explanation is unavailable.
      }

      questionResults[index] = isQuizAnswerCorrect(selectedAnswer, question);
    }),
  );

  return { authoritativeCorrectAnswers, questionResults };
};
