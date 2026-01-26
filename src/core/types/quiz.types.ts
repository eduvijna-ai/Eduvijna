/**
 * LEGACY QUIZ TYPES - Now imports from unified dashboard.types.ts
 * ================================================================
 * This file maintains backward compatibility while using the centralized type system.
 * All core types are now imported from dashboard.types.ts
 */

// Import all core types from the centralized dashboard types
import {
  QuizAvailabilityStatus,
  AttemptStatus,
  QuizFilterStatus,
  DashboardViewType,
  Instructor,
  Student,
  QuizAttempt,
  QuizQuestion,
  QuizQuestionsData,
  Classroom,
  ClassroomDetails,
  QuizDetails,
  DashboardStats,
  WeakStudent,
  WeakTopic,
  TeacherQuizFilters,
  StudentQuizFilters,
  DashboardApiResponse,
  ParsedQuiz,
  QuizSubmission,
  BaseQuiz,
  TeacherQuiz,
  StudentQuiz,
  toTeacherQuiz,
  toStudentQuiz,
  enrichTeacherQuiz,
  parseAttempts,
  parseQuizDetails,
  isTeacherQuiz,
  isStudentQuiz,
  isQuizAvailable,
  isQuizExpired,
  isQuizComingSoon,
  getCompletionPercentage,
  StudentDashboardFilters,
  StudentDashboardQuiz,
  deriveAttemptStatus,
  parseStudentDashboardQuizzes,
  calculateStudentDashboardStats,
} from './dashboard.types';

// Re-export all imported types for backward compatibility
export type {
  QuizAvailabilityStatus,
  QuizFilterStatus,
  DashboardViewType,
  Instructor,
  Student,
  QuizAttempt,
  QuizQuestion,
  QuizQuestionsData,
  Classroom,
  ClassroomDetails,
  QuizDetails,
  DashboardStats,
  WeakStudent,
  WeakTopic,
  TeacherQuizFilters,
  StudentQuizFilters,
  DashboardApiResponse,
  ParsedQuiz,
  QuizSubmission,
  BaseQuiz,
  TeacherQuiz,
  StudentQuiz,
};

// Re-export utility functions
export {
  toTeacherQuiz,
  toStudentQuiz,
  enrichTeacherQuiz,
  parseAttempts,
  parseQuizDetails,
  isTeacherQuiz,
  isStudentQuiz,
  isQuizAvailable,
  isQuizExpired,
  isQuizComingSoon,
  getCompletionPercentage,
  deriveAttemptStatus,
  parseStudentDashboardQuizzes,
  calculateStudentDashboardStats,
};

// Re-export student dashboard types
export type {
  StudentDashboardFilters,
  StudentDashboardQuiz,
};

// Legacy type alias for backward compatibility
export type StudentAttemptStatus = AttemptStatus;

// Teacher dashboard statistics
export interface TeacherDashboardStats {
  total_students: number;
  total_classes: number;
  total_assessments: number;
  active_assessments: number;
  pending_reviews: number;
}

// Student dashboard statistics
export interface StudentDashboardStats {
  upcoming_assessments: number;
  completed_assessments: number;
  average_score: number;
  total_practice_time: number;
}

// Create assessment tile types
export type CreateAssessmentType = 'ai' | 'pdf' | 'image' | 'web' | 'manual';

export interface CreateAssessmentTile {
  type: CreateAssessmentType;
  title: string;
  description: string;
  icon: string;
  color: string;
}

// Practice tile types
export type PracticeType = 'ai' | 'doc' | 'image' | 'web' | 'self-test';

export interface PracticeTile {
  type: PracticeType;
  title: string;
  description: string;
  icon: string;
  color: string;
}
