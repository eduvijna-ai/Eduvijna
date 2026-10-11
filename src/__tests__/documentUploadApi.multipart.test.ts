import { appendDocumentUploadPart } from '../core/utils/documentUploadMultipart';
import {
  generateMultimodalAssessmentFromDocument,
  uploadBookWithMetadata,
} from '../core/services/documentUploadApi';

jest.mock('../core/api/config', () => ({
  apiClient: {
    post: jest.fn(async () => ({
      data: {
        questions: [
          {
            question: 'Sample?',
            options: ['A', 'B'],
            correct_answer: 'A',
          },
        ],
        request_id: 'req-1',
      },
    })),
  },
  API_BASE_URL: 'https://dev-api.eduvijna.com',
}));

const { apiClient } = jest.requireMock('../core/api/config');

describe('documentUploadApi multipart wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generateMultimodalAssessmentFromDocument uses appendDocumentUploadPart for web File', async () => {
    const file = new File(['pdf-bytes'], 'lesson.pdf', { type: 'application/pdf' });
    await generateMultimodalAssessmentFromDocument({
      fileUri: 'blob:lesson',
      fileName: 'lesson.pdf',
      mimeType: 'application/pdf',
      file,
      questionCount: 2,
      difficulty: 'medium',
    });

    const formData = (apiClient.post as jest.Mock).mock.calls[0][1] as FormData;
    const part = formData.get('files');
    expect(part).toBeInstanceOf(Blob);
  });

  it('uploadBookWithMetadata preserves web File/Blob from document library picker', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { book: { doc_id: 'd1', original_filename: 'chapter.pdf', page_count: 3 } },
    });
    const file = new File(['pdf-bytes'], 'chapter.pdf', { type: 'application/pdf' });

    await uploadBookWithMetadata({
      fileUri: 'blob:chapter',
      fileName: 'chapter.pdf',
      mimeType: 'application/pdf',
      file,
      title: 'Chapter 1',
    });

    const formData = (apiClient.post as jest.Mock).mock.calls[0][1] as FormData;
    expect(formData.get('file')).toBe(file);
  });

  it('uploadBookWithMetadata uses appendDocumentUploadPart for native URI', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { book: { doc_id: 'd1', original_filename: 'book.pdf', page_count: 3 } },
    });

    await uploadBookWithMetadata({
      fileUri: 'file:///tmp/book.pdf',
      fileName: 'book.pdf',
      mimeType: 'application/pdf',
      title: 'Book',
    });

    const formData = (apiClient.post as jest.Mock).mock.calls[0][1] as FormData;
    expect(formData.get('file')).toBeTruthy();
    const fd = new FormData();
    appendDocumentUploadPart(fd, 'files', {
      uri: 'file:///tmp/book.pdf',
      name: 'book.pdf',
      mimeType: 'application/pdf',
    });
    expect(fd.get('files')).toBeTruthy();
  });
});
