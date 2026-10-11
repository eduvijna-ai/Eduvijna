import {
  isQuizAnswerCorrect,
  normalizeDocumentQuizQuestions,
  shuffleQuizOptions,
} from '../core/utils/answerMappingUtils';

describe('answer mapping permutations', () => {
  const base = {
    question: '2+2?',
    options: ['3', '4', '5', '6'],
    correctAnswer: 'B',
    answer: 'B',
  };

  it('keeps correctness after shuffle', () => {
    const normalized = normalizeDocumentQuizQuestions([base], true)[0];
    const correctText = normalized.correctAnswer;
    const selected = normalized.options.find((o) => o === correctText) ?? '';
    expect(isQuizAnswerCorrect(selected, normalized)).toBe(true);
  });

  it('throws when shuffle loses correct option', () => {
    expect(() => shuffleQuizOptions(['a', 'b'], 'C')).toThrow(
      'CORRECT_OPTION_NOT_FOUND_AFTER_SHUFFLE',
    );
  });

  it('does not default missing answers to A during normalization', () => {
    const normalized = normalizeDocumentQuizQuestions(
      [{ question: 'Q', options: ['x', 'y'], correctAnswer: '', answer: '' }],
      false,
    )[0];
    expect(normalized.correctAnswer).toBe('');
    expect(normalized.optionsNormalized).toBe(false);
  });
});
