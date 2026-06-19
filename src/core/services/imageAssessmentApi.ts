/**
 * Image Assessment API service (mobile parity with web imageAssessmentService +
 * the /api/v1/analyze-image flow used by ImageAssessmentWorkspace).
 *
 * Endpoints:
 *  - POST   /api/v1/analyze-image                      (multipart: file, student_level, language)
 *  - POST   /api/v1/image-assessments                  (persist analyzed image)
 *  - GET    /api/v1/image-assessments?search=          (library list)
 *  - GET    /api/v1/image-assessments/:id
 *  - GET    /api/v1/image-assessments/by-assessment/:assessmentId
 *  - PATCH  /api/v1/image-assessments/:id/assessment   (link generated quiz)
 */
import { apiClient } from '../api/config';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export type ImageStudentLevel = 'elementary' | 'middle_school' | 'advanced';

export interface ImageElement {
  label: string;
  description: string;
  role?: string;
}

export interface ImageConcept {
  name: string;
  explanation: string;
  importance: string;
}

export interface ImageAnalysisResponse {
  summary: string;
  summary_points?: string[];
  concepts?: ImageConcept[];
  subject?: string;
  topic?: string;
  keywords?: string[];
  elements?: ImageElement[];
  process?: Array<{ step: string; explanation: string }>;
  relationships?: Array<{ from: string; to: string; relation: string }>;
  mathematics?: { detected?: boolean; expressions?: Array<{ latex: string; meaning: string }> };
  applications?: Array<{ use_case: string; explanation: string }>;
  tags?: Record<string, any>;
  [key: string]: any;
}

export interface ImageAssessmentItem {
  id: number;
  image_name: string;
  mime_type: string;
  image_base64: string;
  student_level?: string;
  language?: string;
  analysis_payload?: ImageAnalysisResponse | null;
  source?: string;
  assessment_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SaveImageAssessmentPayload {
  image_name: string;
  mime_type: string;
  image_base64: string;
  student_level?: string;
  language?: string;
  analysis_payload?: ImageAnalysisResponse | null;
  source?: string;
  assessment_id?: number | null;
  school_id?: number | null;
}

const BASE = '/api/v1/image-assessments';

/**
 * Compress a local image and return a JPEG file URI suitable for upload.
 * Mirrors quizzes.generateQuizFromImage to avoid 413 errors on large photos.
 */
async function compressImage(fileUri: string): Promise<{ uri: string; mimeType: string }> {
  try {
    const context = ImageManipulator.manipulate(fileUri);
    context.resize({ width: 1500 });
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: 0.6, format: SaveFormat.JPEG });
    context.release();
    image.release();
    return { uri: result.uri, mimeType: 'image/jpeg' };
  } catch {
    return { uri: fileUri, mimeType: 'image/jpeg' };
  }
}

/**
 * Analyze an educational image. Returns the structured analysis payload.
 */
export async function analyzeImage(params: {
  fileUri: string;
  studentLevel: ImageStudentLevel;
  language: string;
}): Promise<ImageAnalysisResponse> {
  const compressed = await compressImage(params.fileUri);

  const formData = new FormData();
  formData.append('file', {
    uri: compressed.uri,
    type: compressed.mimeType,
    name: 'image.jpg',
  } as any);
  formData.append('student_level', params.studentLevel);
  formData.append('language', params.language);

  const response = await apiClient.post<ImageAnalysisResponse>('/api/v1/analyze-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

  const data = response.data;
  if (!data || !data.summary) {
    throw new Error('Unable to analyze the image. Please try a different image.');
  }
  return data;
}

/**
 * Read a local file as a base64 string (no data: prefix) for persistence.
 */
export async function fileToBase64(fileUri: string): Promise<string> {
  return FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function saveImageAssessment(
  payload: SaveImageAssessmentPayload,
): Promise<ImageAssessmentItem> {
  const response = await apiClient.post<ImageAssessmentItem>(BASE, payload);
  return response.data;
}

export async function listImageAssessments(search?: string): Promise<ImageAssessmentItem[]> {
  const qs = new URLSearchParams();
  if (search && search.trim()) qs.set('search', search.trim());
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const response = await apiClient.get<ImageAssessmentItem[]>(`${BASE}${suffix}`);
  return Array.isArray(response.data) ? response.data : [];
}

export async function getImageAssessment(id: number): Promise<ImageAssessmentItem> {
  const response = await apiClient.get<ImageAssessmentItem>(`${BASE}/${id}`);
  return response.data;
}

export async function getImageAssessmentByAssessmentId(
  assessmentId: number,
): Promise<ImageAssessmentItem> {
  const response = await apiClient.get<ImageAssessmentItem>(`${BASE}/by-assessment/${assessmentId}`);
  return response.data;
}

export async function linkImageAssessment(
  id: number,
  assessmentId: number,
): Promise<ImageAssessmentItem> {
  const response = await apiClient.patch<ImageAssessmentItem>(`${BASE}/${id}/assessment`, {
    assessment_id: assessmentId,
  });
  return response.data;
}

/** Build a data URL for display from a persisted base64 record. */
export function toDataUrl(mimeType: string | undefined, imageBase64: string): string {
  return `data:${mimeType || 'image/png'};base64,${imageBase64}`;
}

// ── Context mapping (mirrors web mappedContext) ─────────────────────────────

export interface MappedImageContext {
  subject: string;
  topic: string;
  lesson: string;
  className: string;
  difficulty: string;
  worksheetLevel: string;
  language: string;
  subTopic: string;
}

const CLASS_MAP: Record<ImageStudentLevel, string> = {
  elementary: 'Classes 3-5',
  middle_school: 'Classes 6-9',
  advanced: 'Classes 10-12',
};

const DIFFICULTY_MAP: Record<ImageStudentLevel, string> = {
  elementary: 'Easy',
  middle_school: 'Medium',
  advanced: 'Hard',
};

const WORKSHEET_LEVEL_MAP: Record<ImageStudentLevel, string> = {
  elementary: 'Elementary',
  middle_school: 'Intermediate',
  advanced: 'Advanced',
};

export function buildMappedContext(
  analysis: ImageAnalysisResponse | null,
  studentLevel: ImageStudentLevel,
  language: string,
  imageName: string,
): MappedImageContext {
  if (analysis) {
    const tags = analysis.tags || {};
    const rawSubject = String(analysis.subject || tags.Subject || tags.subject || '').trim();
    const rawTopic = String(analysis.topic || tags.Topic || tags.topic || '').trim();
    const rawSubTopic = String(tags.SubTopic || tags.subtopic || '').trim();

    const conceptNames = (analysis.concepts || [])
      .map((c) => c?.name)
      .filter(Boolean)
      .slice(0, 6)
      .join(', ');

    const elementNames = (analysis.elements || [])
      .map((e) => e?.label)
      .filter(Boolean)
      .slice(0, 6)
      .join(', ');

    const enrichedTopic = [
      rawTopic,
      rawSubTopic ? `SubTopic: ${rawSubTopic}` : '',
      conceptNames ? `Concepts: ${conceptNames}` : '',
      elementNames ? `Elements: ${elementNames}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    return {
      subject: rawSubject || 'General Science',
      topic: enrichedTopic || rawTopic || 'Visual Understanding',
      lesson: rawTopic || imageName || 'Visual Understanding',
      className: CLASS_MAP[studentLevel],
      difficulty: DIFFICULTY_MAP[studentLevel],
      worksheetLevel: WORKSHEET_LEVEL_MAP[studentLevel],
      language: language || 'en',
      subTopic: rawSubTopic,
    };
  }

  return {
    subject: 'General Science',
    topic: 'Visual Understanding',
    lesson: imageName || 'Visual Understanding',
    className: CLASS_MAP[studentLevel],
    difficulty: DIFFICULTY_MAP[studentLevel],
    worksheetLevel: WORKSHEET_LEVEL_MAP[studentLevel],
    language: language || 'en',
    subTopic: '',
  };
}

/**
 * Build the contextual prompt fed into /api/v1/quiz/generate, matching web's
 * generateQuiz contextualPrompt construction.
 */
export function buildQuizPrompt(
  analysis: ImageAnalysisResponse,
  ctx: MappedImageContext,
  additionalInstructions: string,
): string {
  const basePrompt = analysis.summary || JSON.stringify(analysis);
  return [
    basePrompt,
    `Language: ${ctx.language}`,
    `Enriched Topic: ${ctx.topic}`,
    'Use the provided topic context to generate questions based on conceptual understanding, visual elements, and real-world usage.',
    additionalInstructions.trim() ? `Additional Instructions: ${additionalInstructions.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Build the worksheet itext from the analysis (mirrors web handleGenerateWorksheet).
 */
export function buildWorksheetItext(
  analysis: ImageAnalysisResponse | null,
  language: string,
): string {
  const tags = analysis?.tags || {};
  const summary = String(analysis?.summary || '').trim();
  const subjectTag = String(analysis?.subject || tags.Subject || tags.subject || '').trim();
  const topicTag = String(analysis?.topic || tags.Topic || tags.topic || '').trim();
  const subTopicTag = String(tags.SubTopic || tags.subtopic || '').trim();
  const typeTag = String(tags.Type || tags.type || '').trim();
  const difficultyTag = String(tags.Difficulty || tags.difficulty || '').trim();
  const languageTag = String(tags.Language || tags.language || language || '').trim();
  const keywordsList = (Array.isArray(analysis?.keywords) ? analysis?.keywords : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return [
    summary ? `Analysis Summary: ${summary}` : '',
    [
      subjectTag ? `Subject: ${subjectTag}` : '',
      topicTag ? `Topic: ${topicTag}` : '',
      subTopicTag ? `SubTopic: ${subTopicTag}` : '',
      typeTag ? `Type: ${typeTag}` : '',
      difficultyTag ? `Difficulty: ${difficultyTag}` : '',
      languageTag ? `Language: ${languageTag}` : '',
    ]
      .filter(Boolean)
      .join(' | '),
    keywordsList.length ? `Keywords: ${keywordsList.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export const IMAGE_LEVELS: Array<{ value: ImageStudentLevel; label: string }> = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'middle_school', label: 'Middle School' },
  { value: 'advanced', label: 'Advanced' },
];

export const IMAGE_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'te', label: 'Telugu' },
  { value: 'ta', label: 'Tamil' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'pa', label: 'Punjabi' },
  { value: 'or', label: 'Odia' },
  { value: 'as', label: 'Assamese' },
  { value: 'ur', label: 'Urdu' },
];
