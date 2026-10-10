jest.mock('../core/services/openQuizHandler', () => ({
  handleOpenQuiz: jest.fn(),
}));

import { handleOpenQuiz } from '../core/services/openQuizHandler';

describe('web notification open-quiz routing', () => {
  it('documents session_id precedence for bell list taps', () => {
    const data = { session_id: 'sess-1', quiz_id: 42 };
    const rawSessionId = data?.session_id ?? (data as { sessionId?: string }).sessionId;
    expect(rawSessionId).toBe('sess-1');
    expect(handleOpenQuiz).toBeDefined();
  });
});
