import {
  isOptionTheCorrectAnswer,
  isOptionTheUserAnswer,
} from '../core/utils/answerMappingUtils';

describe('option identity through ordering', () => {
  const options = ['$x^2$', 'Plain text', 'Mixed $a+b$ prose', 'Distractor'];

  it('matches user selection by option text after shuffle', () => {
    const shuffled = [options[2], options[0], options[3], options[1]];
    const picked = options[2];
    expect(isOptionTheUserAnswer(picked, picked, shuffled)).toBe(true);
    expect(isOptionTheUserAnswer(options[0], picked, shuffled)).toBe(false);
  });

  it('matches correct answer by content not index', () => {
    const question = {
      options,
      correctAnswer: 'Plain text',
      answer: 'Plain text',
    };
    expect(isOptionTheCorrectAnswer('Plain text', question)).toBe(true);
    expect(isOptionTheCorrectAnswer(options[0], question)).toBe(false);
  });
});
