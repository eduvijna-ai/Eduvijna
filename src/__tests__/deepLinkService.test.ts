import {
  getInitialDeepLink,
  parseDeepLink,
  resetInitialDeepLinkCache,
} from '../core/services/deepLinkService';
import { Linking } from 'react-native';

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

describe('getInitialDeepLink cache', () => {
  it('allows a fresh initial URL probe after reset', async () => {
    (Linking.getInitialURL as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce('eduvijna://openquiz?session_id=first')
      .mockResolvedValueOnce('eduvijna://openquiz?session_id=second');
    await expect(getInitialDeepLink()).resolves.toContain('first');
    await expect(getInitialDeepLink()).resolves.toContain('first');
    resetInitialDeepLinkCache();
    await expect(getInitialDeepLink()).resolves.toContain('second');
  });
});
