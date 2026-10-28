import {
  generateFromBook,
  generateMultimodalAssessmentFromDocument,
} from '../core/services/documentUploadApi';

jest.mock('../core/api/config', () => ({
  apiClient: {
    post: jest.fn(async () => ({
      data: {
        questions: [
          {
            question: 'Q?',
            options: ['A', 'B'],
            correct_answer: 'A',
          },
        ],
      },
    })),
  },
  API_BASE_URL: 'https://dev-api.eduvijna.com',
}));

const { apiClient } = jest.requireMock('../core/api/config');

describe('documentUploadApi additional_instructions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards additional_instructions in generate-from-book body', async () => {
    await generateFromBook({
      docId: 'doc-abc',
      pageNumbers: [1, 2],
      questionCount: 5,
      difficulty: 'medium',
      subject: 'Physics',
      gradeLevel: 'Class 10',
      lessonTitle: 'Waves',
      additionalInstructions: 'Include numericals only',
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/study-materials/generate-from-book',
      expect.objectContaining({
        additional_instructions: 'Include numericals only',
        difficulty: '4',
        page_numbers: [1, 2],
        doc_id: 'doc-abc',
      }),
      expect.any(Object),
    );
  });

  it('forwards additional_instructions in multimodal gallery/file generate form data', async () => {
    await generateMultimodalAssessmentFromDocument({
      fileUri: 'file:///gallery-page.jpg',
      fileName: 'page.jpg',
      mimeType: 'image/jpeg',
      questionCount: 5,
      difficulty: 'medium',
      additionalInstructions: 'Emphasize ray diagrams',
    });

    const formData = (apiClient.post as jest.Mock).mock.calls[0][1] as FormData;
    expect(formData.get('additional_instructions')).toBe('Emphasize ray diagrams');
  });
});
