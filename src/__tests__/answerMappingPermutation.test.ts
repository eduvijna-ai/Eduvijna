import {
  isQuizAnswerCorrect,
  normalizeDocumentQuizQuestions,
  shuffleQuizOptions,
} from '../core/utils/answerMappingUtils';
import { letterToOptionIndex, resolveCorrectOptionIndex } from '../core/utils/optionIdentity';

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

  it('keeps x and X distinct', () => {
    const q = {
      question: 'variable?',
      options: ['x', 'X', 'y', 'Y'],
      correctAnswer: 'x',
    };
    expect(resolveCorrectOptionIndex('x', q.options)).toBe(0);
    expect(resolveCorrectOptionIndex('X', q.options)).toBe(1);
    expect(isQuizAnswerCorrect('x', { ...q, correctOptionIndex: 0 })).toBe(true);
    expect(isQuizAnswerCorrect('X', { ...q, correctOptionIndex: 0 })).toBe(false);
  });

  it('rejects out-of-range letters', () => {
    expect(letterToOptionIndex('E', 4)).toBeNull();
    expect(letterToOptionIndex('A', 0)).toBeNull();
  });

  it('does not pick first duplicate display text', () => {
    const options = ['same', 'same', 'other', 'another'];
    expect(resolveCorrectOptionIndex('same', options)).toBeNull();
  });

  it('preserves identity across shuffle with fixed random', () => {
    const normalized = normalizeDocumentQuizQuestions(
      [
        {
          question: 'Q',
          options: ['a', 'b', 'c', 'd'],
          correctAnswer: 'C',
        },
      ],
      true,
    )[0];
    const reNormalized = normalizeDocumentQuizQuestions([normalized], false)[0];
    expect(reNormalized.options).toEqual(normalized.options);
    expect(reNormalized.correctOptionIndex).toBe(normalized.correctOptionIndex);
  });
});
