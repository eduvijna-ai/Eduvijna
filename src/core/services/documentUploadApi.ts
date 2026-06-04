import { apiClient } from '../api/config';

export type DocumentUploadDifficulty = 'easy' | 'medium' | 'hard';

export interface DocumentUploadBook {
  id: string;
  title: string;
  originalName: string;
  uploadedFileName?: string;
  docId?: string;
  totalPages: number;
  fileSize?: number;
  fileUri?: string;
  mimeType?: string;
  thumbnailUri?: string;
  createdAt: string;
}

export interface GenerateMultimodalParams {
  fileUri: string;
  fileName: string;
  mimeType?: string;
  questionCount: number;
  difficulty: DocumentUploadDifficulty;
  language?: string;
  subject?: string;
  gradeLevel?: string;
  lessonTitle?: string;
  selectedPages?: number[];
}

const toDifficultyPayload = (difficulty: DocumentUploadDifficulty): string => {
  if (difficulty === 'easy') return '2';
  if (difficulty === 'medium') return '4';
  return '6';
};

const normalizeQuestions = (questionsRaw: any[]): Array<{
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  answer: string;
  explanation: string | null;
}> => {
  if (!Array.isArray(questionsRaw)) return [];

  return questionsRaw
    .map((q: any, idx: number) => {
      const options = Array.isArray(q?.options) ? q.options.map((o: any) => String(o ?? '').trim()) : [];
      const correct = String(q?.correctAnswer ?? q?.answer ?? 'A').trim().toUpperCase();
      const safeCorrect = ['A', 'B', 'C', 'D'].includes(correct) ? correct : 'A';
      return {
        id: String(q?.id ?? `du-q-${idx}`),
        question: String(q?.question ?? '').trim(),
        options,
        correctAnswer: safeCorrect,
        answer: safeCorrect,
        explanation: q?.explanation ? String(q.explanation) : null,
      };
    })
    .filter((q) => q.question.length > 0 && q.options.length >= 2);
};

export async function uploadDocumentToRag(params: {
  fileUri: string;
  fileName: string;
  mimeType?: string;
  gradeLevel?: string;
  subject?: string;
  lessonTitle?: string;
  forceOcr?: boolean;
}): Promise<Partial<DocumentUploadBook>> {
  const formData = new FormData();
  formData.append('file', {
    uri: params.fileUri,
    name: params.fileName,
    type: params.mimeType || 'application/octet-stream',
  } as any);
  formData.append('auto_embed', 'true');
  formData.append('force_ocr', params.forceOcr ? 'true' : 'false');

  if (params.gradeLevel) formData.append('grade_level', params.gradeLevel);
  if (params.subject) formData.append('subject', params.subject);
  if (params.lessonTitle) formData.append('lesson_title', params.lessonTitle);

  const response = await apiClient.post('/api/v1/rag/ingest-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

  const payload = response?.data ?? {};
  const firstDoc = Array.isArray(payload?.documents) ? payload.documents[0] : null;

  return {
    uploadedFileName:
      firstDoc?.title ||
      firstDoc?.original_filename ||
      firstDoc?.filename ||
      params.fileName,
    docId: firstDoc?.doc_id || firstDoc?.id,
    totalPages: Number(firstDoc?.total_pages || firstDoc?.pages || 5),
    fileSize: Number(firstDoc?.file_size || 0) || undefined,
  };
}

export async function generateMultimodalAssessmentFromDocument(params: GenerateMultimodalParams): Promise<{
  quizData: {
    id: string;
    title: string;
    class?: string;
    subject?: string;
    difficulty?: string;
    lesson?: string;
    questions: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: string;
      answer: string;
      explanation: string | null;
    }>;
    regenerationParams: {
      type: 'document-upload';
      fileName: string;
      grade: string;
      subject: string;
      level: string;
      lesson: string;
      count: number;
        selectedPages?: number[];
    };
  };
  raw: any;
}> {
  const formData = new FormData();
  formData.append('files', {
    uri: params.fileUri,
    name: params.fileName,
    type: params.mimeType || 'application/octet-stream',
  } as any);
  formData.append('question_count', String(Math.max(1, Math.min(30, params.questionCount))));
  formData.append('difficulty', toDifficultyPayload(params.difficulty));
  formData.append('language', params.language || 'English');
  formData.append('subject', params.subject || 'General');
  formData.append('grade_level', params.gradeLevel || 'Class 10');
  formData.append('lesson_title', params.lessonTitle || 'Document Assessment');
  if (Array.isArray(params.selectedPages) && params.selectedPages.length > 0) {
    const cleaned = Array.from(
      new Set(
        params.selectedPages
          .map((p) => Number(p))
          .filter((p) => Number.isInteger(p) && p > 0),
      ),
    ).sort((a, b) => a - b);

    if (cleaned.length > 0) {
      // Keep both keys for backward/forward compatibility with backend variants.
      formData.append('selected_pages', JSON.stringify(cleaned));
      formData.append('selected_page_numbers', cleaned.join(','));
    }
  }

  const response = await apiClient.post('/api/v1/assessment/generate-multimodal', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
  });

  const payload = response?.data ?? {};
  const questions = normalizeQuestions(payload?.questions || []);

  return {
    quizData: {
      id: String(payload?.request_id || `du-${Date.now()}`),
      title: params.lessonTitle || params.fileName,
      class: params.gradeLevel,
      subject: params.subject,
      difficulty: params.difficulty,
      lesson: params.lessonTitle,
      questions,
      regenerationParams: {
        type: 'document-upload',
        fileName: params.fileName,
        grade: params.gradeLevel || '',
        subject: params.subject || '',
        level: params.difficulty,
        lesson: params.lessonTitle || '',
        count: params.questionCount,
        selectedPages: params.selectedPages,
      },
    },
    raw: payload,
  };
}
