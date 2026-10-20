import { buildStrictQuizContent } from '../screens/CreateHandwrittenQuizScreen';

describe('handwritten generate-strict content contract (web parity)', () => {
  it('prepends class/subject/lesson metadata before OCR text', () => {
    const content = buildStrictQuizContent({
      classValue: '4A',
      subject: 'Math',
      lesson: 'Fractions',
      difficulty: 'medium',
      questionCount: 5,
      additionalInstructions: 'Keep short',
      ocrText: 'Page one handwriting…',
    });
    expect(content).toContain('Class: 4A');
    expect(content).toContain('Subject: Math');
    expect(content).toContain('Lesson: Fractions');
    expect(content).toContain('Difficulty: medium');
    expect(content).toContain('Number of questions: 5');
    expect(content).toContain('Instructions: Keep short');
    expect(content.endsWith('Page one handwriting…')).toBe(true);
  });

  it('still works when optional fields are blank', () => {
    const content = buildStrictQuizContent({ ocrText: 'Only OCR' });
    expect(content).toBe('Only OCR');
  });
});
