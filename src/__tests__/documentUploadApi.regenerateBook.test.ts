import { regenerateDocumentUploadQuiz } from '../core/services/documentUploadApi';

jest.mock('../core/api/config', () => ({
  apiClient: {
    post: jest.fn(async () => ({ data: { questions: [] } })),
  },
  API_BASE_URL: 'https://dev-api.eduvijna.com',
}));

describe('regenerateDocumentUploadQuiz server book', () => {
  it('fails when generate-from-book returns zero questions', async () => {
    await expect(
      regenerateDocumentUploadQuiz(
        {
          type: 'document-upload',
          useServerBook: true,
          docId: 'doc-1',
          selectedPages: [1],
          count: 5,
          level: 'medium',
        },
        { id: 'quiz-1', questions: [{ id: 'q1' }] },
      ),
    ).rejects.toThrow(/no questions|generate_from_book_zero_questions/i);
  });
});
