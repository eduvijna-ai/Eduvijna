import { listUserAssessments } from '../core/services/sharedApi';
import { loadDocumentAssessmentHistory } from '../core/services/documentAssessmentHistory.service';

jest.mock('../core/services/sharedApi', () => ({
  listUserAssessments: jest.fn(),
}));

const mockList = listUserAssessments as jest.MockedFunction<typeof listUserAssessments>;

describe('loadDocumentAssessmentHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges Doc-File and legacy document quiz sources', async () => {
    mockList.mockImplementation(async (type, source) => {
      if (type === 'web-quiz' && source === 'Doc-File-Assessment') {
        return [{ id: 1, title: 'Doc quiz', created_at: '2026-01-01', question_count: 5 }];
      }
      if (type === 'web-quiz' && source === 'Document') {
        return [{ id: 1, title: 'Dup', created_at: '2026-01-01', question_count: 5 }];
      }
      if (type === 'worksheet' && source === 'Doc-File-Worksheet') {
        return [{ id: 2, title: 'WS', created_at: '2026-01-02', question_count: 10 }];
      }
      return [];
    });

    const history = await loadDocumentAssessmentHistory();
    expect(history.quizzes).toHaveLength(1);
    expect(history.quizzes[0].title).toBe('Doc quiz');
    expect(history.worksheets).toHaveLength(1);
  });
});
