import { buildWorksheetGeneratePayload } from '../core/utils/worksheetGeneratePayload';

describe('buildWorksheetGeneratePayload (Quiz-React optional-string parity)', () => {
  it('uses empty strings for omitted optional text fields when no source text', () => {
    const body = buildWorksheetGeneratePayload({
      class: '',
      subject: '',
      lesson: '',
      level: 'medium',
      mcq_count: 2,
      fitb_count: 0,
      tf_count: 0,
      short_q_count: 0,
      matching_count: 0,
    });
    expect(body.itext).toBe('');
    expect(body.class).toBe('');
    expect(body.subject).toBe('');
    expect(body.lesson).toBe('');
    expect(body.long_q_count).toBe(0);
    expect(body.type).toBe('worksheet');
  });

  it('defaults class/subject/lesson when itext is present', () => {
    const body = buildWorksheetGeneratePayload({
      class: '',
      subject: '',
      lesson: '',
      level: 'easy',
      itext: 'Page extract content',
      mcq_count: 1,
      fitb_count: 0,
      tf_count: 0,
      short_q_count: 0,
      matching_count: 0,
    });
    expect(body.class).toBe('General');
    expect(body.subject).toBe('Document');
    expect(body.lesson).toBe('Selected content');
    expect(body.itext).toBe('Page extract content');
  });

  it('never emits null or undefined string slots', () => {
    const body = buildWorksheetGeneratePayload({
      class: '10',
      subject: 'Math',
      lesson: 'Fractions',
      level: 'hard',
      itext: undefined,
      mcq_count: 1,
      fitb_count: 1,
      tf_count: 0,
      short_q_count: 0,
      matching_count: 0,
      type: undefined,
    });
    for (const value of Object.values(body)) {
      expect(value).not.toBeNull();
      expect(value).not.toBeUndefined();
    }
  });
});
