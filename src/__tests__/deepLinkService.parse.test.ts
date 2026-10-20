import { parseDeepLink } from '../core/services/deepLinkService';

describe('parseDeepLink', () => {
  it('parses distinct session_id and quiz_id parameters', () => {
    const parsed = parseDeepLink(
      'eduvijna://openquiz?session_id=a6882262-5c50-4cf5-a4a8-dc8786862916&quiz_id=479',
    );
    expect(parsed).toMatchObject({
      type: 'assessment',
      sessionId: 'a6882262-5c50-4cf5-a4a8-dc8786862916',
      quizId: '479',
    });
  });

  it('trims whitespace from session_id', () => {
    const parsed = parseDeepLink('eduvijna://openquiz?session_id=%20sess-1%20&quiz_id=1');
    expect(parsed?.sessionId).toBe('sess-1');
  });
});
