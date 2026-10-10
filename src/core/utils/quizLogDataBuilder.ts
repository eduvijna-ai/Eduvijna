import {
  isQuizAnswerCorrect,
  optionStringToLetter,
  type PlayableQuizQuestion,
} from './answerMappingUtils';

export interface QuizSubmissionAnswerLogEntry {
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string | null;
  isCorrect: boolean;
}

export function buildAssignedQuizLogData(params: {
  questions: PlayableQuizQuestion[];
  selectedAnswers: Record<number, string>;
  questionCount: number;
  timeSpentSeconds: number;
  attemptId: number;
}): Record<string, unknown> {
  const { questions, selectedAnswers, questionCount, timeSpentSeconds, attemptId } = params;

  const answers: QuizSubmissionAnswerLogEntry[] = questions.map((question, index) => {
    const selectedText = selectedAnswers[index];
    const letter =
      selectedText != null && selectedText !== ''
        ? optionStringToLetter(selectedText, question.options) ??
          (selectedText.length === 1 ? selectedText.toUpperCase() : selectedText)
        : null;

    const correctRaw = question.correctAnswer ?? question.answer ?? '';
    const userAnswer = letter != null ? String(letter) : null;

    return {
      questionNumber: index + 1,
      question: question.question,
      options: question.options,
      correctAnswer: correctRaw,
      userAnswer,
      isCorrect: selectedText ? isQuizAnswerCorrect(selectedText, question) : false,
    };
  });

  return {
    answers,
    questionCount,
    time_spent_seconds: timeSpentSeconds,
    attempt_id: attemptId,
    client: { platform: 'eduvijna-mobile' },
  };
}
