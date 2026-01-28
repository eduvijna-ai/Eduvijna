import { apiClient } from '@core/api/config';

/**
 * Generate quiz from plain text input
 * POST /api/v1/quiz/generate
 * Body: { text, student_level?, additional_instructions? }
 */
export async function generateQuizFromText(
  text: string,
  studentLevel: string = 'advance',
  additionalInstructions?: string
) {
  const res = await apiClient.post('/api/v1/quiz/generate', {
    text,
    student_level: studentLevel,
    additional_instructions: additionalInstructions,
  });
  return res.data;
}

/**
 * Generate quiz from YouTube video URL
 * POST /api/v1/youtubesummary
 * Body: { url, student_level?, additional_instructions? }
 */
export async function generateQuizFromYouTube(
  url: string,
  studentLevel: string = 'advance',
  additionalInstructions?: string
) {
  const res = await apiClient.post('/api/v1/youtubesummary', {
    url,
    student_level: studentLevel,
    additional_instructions: additionalInstructions,
  });
  return res.data;
}

/**
 * Generate quiz from image upload
 * POST /api/v1/upload-educational-image
 * Form: file (image), student_level?, additional_instructions?
 */
export async function generateQuizFromImage(
  fileUri: string,
  studentLevel: string = 'advance',
  additionalInstructions?: string
) {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: 'image/jpeg',
    name: fileUri.split('/').pop() || 'image.jpg',
  } as any);
  
  if (studentLevel) {
    formData.append('student_level', studentLevel);
  }
  
  if (additionalInstructions) {
    formData.append('additional_instructions', additionalInstructions);
  }

  const res = await apiClient.post('/api/v1/analyze-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * Generate quiz from PDF upload
 * POST /api/v1/upload-educational-pdf
 * Form: file (PDF), grade?, subject?, student_level?, additional_instructions?
 */
export async function generateQuizFromPDF(
  fileUri: string,
  grade?: string,
  subject?: string,
  studentLevel: string = 'advance',
  additionalInstructions?: string
) {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: 'application/pdf',
    name: fileUri.split('/').pop() || 'document.pdf',
  } as any);
  
  if (grade) {
    formData.append('grade', grade);
  }
  
  if (subject) {
    formData.append('subject', subject);
  }
  
  if (studentLevel) {
    formData.append('student_level', studentLevel);
  }
  
  if (additionalInstructions) {
    formData.append('additional_instructions', additionalInstructions);
  }

  const res = await apiClient.post('/api/v1/upload-educational-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * Generate quiz from website URL
 * POST /api/v1/websitesummary
 * Body: { url, student_level?, additional_instructions? }
 */
export async function generateQuizFromWebsite(
  url: string,
  studentLevel: string = 'advance',
  additionalInstructions?: string
) {
  console.log('Generating quiz from website URL:', url);
  const res = await apiClient.post('/api/v1/websitesummary', {
    weblink: url,  // Backend expects 'weblink' not 'url'
    student_level: studentLevel,
    additional_instructions: additionalInstructions,
  });
  console.log('Website quiz generation response:', res.data);
  return res.data;
}

/**
 * Generate quiz from document upload (DOC/DOCX)
 * POST /api/v1/docsummary
 * Form: file, grade?, subject?, student_level?, additional_instructions?, metadata
 */
export async function generateQuizFromDocument(
  fileUri: string, 
  grade?: string, 
  subject?: string, 
  studentLevel: string = 'advance', 
  additionalInstructions?: string,
  metadata?: { board?: string; medium?: string; chapter?: string; unit?: string }
) {
  try {
    // Validate fileUri
    if (!fileUri) {
      throw new Error('File URI is required for document quiz generation');
    }
    
    const formData = new FormData();
    
    // Check if it's a file URI or URL
    if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
      // For URLs, send as a regular JSON request
      const requestData = {
        url: fileUri,
        student_level: studentLevel || 'advance',
        additional_instructions: additionalInstructions || '',
        ...(metadata?.board && { board: metadata.board }),
        ...(metadata?.medium && { medium: metadata.medium }),
        ...(metadata?.chapter && { chapter: metadata.chapter }),
        ...(metadata?.unit && { unit: metadata.unit }),
      };
      
      const res = await apiClient.post('/api/v1/docsummary', requestData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000, // 60 second timeout
      });
      return res.data;
    } else {
      // For file uploads, append to FormData properly
      formData.append('file', {
        uri: fileUri,
        type: 'application/pdf', // Default to PDF, adjust if needed
        name: fileUri.split('/').pop() || 'document.pdf',
      } as any);
      
      if (studentLevel) {
        formData.append('student_level', studentLevel);
      }
      
      if (additionalInstructions) {
        formData.append('additional_instructions', additionalInstructions);
      }
      
      if (grade) {
        formData.append('grade', grade);
      }
      
      if (subject) {
        formData.append('subject', subject);
      }
      
      // Add metadata if provided
      if (metadata?.board) {
        formData.append('board', metadata.board);
      }
      if (metadata?.medium) {
        formData.append('medium', metadata.medium);
      }
      if (metadata?.chapter) {
        formData.append('chapter', metadata.chapter);
      }
      if (metadata?.unit) {
        formData.append('unit', metadata.unit);
      }

      const res = await apiClient.post('/api/v1/docsummary', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // 60 second timeout for file uploads
      });
      return res.data;
    }
  } catch (error: any) {
    console.error('Document analysis error:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    if (error.message?.includes('Network')) {
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    } else if (error.response?.status === 413) {
      throw new Error('File is too large. Please upload a smaller file (max 10MB).');
    } else if (error.response?.status === 415) {
      throw new Error('Unsupported file type. Please upload PDF, DOC, DOCX, or TXT files.');
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error('Request timed out. Please try again with a smaller file.');
    }
    
    throw new Error(error.response?.data?.detail || error.message || 'Failed to analyze document');
  }
}

/**
 * Create quiz assignment
 * POST /api/v1/dashboard/quiz-assignments
 * Body: { quiz_id, class_id, assigned_by, assigned_at, due_date, is_active }
 */
export async function createQuizAssignment(assignmentData: {
  quiz_id: number;
  class_id: string;
  assigned_by: string;
  assigned_at: string;
  due_date: string;
  is_active: boolean;
}) {
  const response = await apiClient.post('/api/v1/dashboard/quiz-assignments', assignmentData);
  return response.data;
}

/**
 * Create classroom quiz entry
 * POST /api/v1/dashboard/classroom-quizzes
 * Body: { quiz_id, classroom_id, instructor_id, topic, date_created, is_active }
 */
export async function createClassroomQuiz(classroomQuizData: {
  quiz_id: number;
  classroom_id: string;
  instructor_id: string;
  topic: string;
  date_created: string;
  is_active: boolean;
}) {
  const response = await apiClient.post('/api/v1/dashboard/classroom-quizzes', classroomQuizData);
  return response.data;
}
