import { parseDeepLink } from '../core/services/deepLinkService';

describe('parseDeepLink', () => {
  it('parses openquiz session_id for custom scheme URLs', () => {
    const parsed = parseDeepLink('eduvijna://openquiz?session_id=abc-123&quiz_id=9');
    expect(parsed).toEqual({
      type: 'assessment',
      assessmentId: 'abc-123',
      sessionId: 'abc-123',
      classroomId: undefined,
      quizId: '9',
    });
  });
});
