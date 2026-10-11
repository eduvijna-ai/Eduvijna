/**
 * Attended quiz API types (aligned with Quiz-React dashboard types).
 */

export interface AttendedQuizQuestion {
  question_id: number;
  question: string;
  options: string[];
  student_answer: string | null;
  answer_key: string | null;
  is_correct: boolean | null;
}

export interface AttendedQuizResponse {
  student_id: string;
  classroom_id: string;
  quiz_id: number;
  session_id: string | null;
  file_name: string | null;
  duration: number;
  submitted_at: string | null;
  created_at: string | null;
  time_spent_seconds: number | null;
  score?: number | null;
  assessment_type?: string | null;
  log_data?: Record<string, unknown> | null;
  worksheet_data?: Record<string, unknown> | null;
  counts: {
    total_questions: number;
    questions_answered: number;
    questions_skipped: number;
  };
  items: AttendedQuizQuestion[];
}

export interface AttendedQuizParams {
  student_id: string;
  classroom_id?: string;
  session_id?: string;
  quiz_id: number | string;
}

export interface QuizAttemptRecord {
  id: number;
  quiz_id: number;
  student_id: string;
  class_id: string;
  attempt_number: number;
  score: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number | null;
}
