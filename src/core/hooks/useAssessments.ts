/**
 * useAssessments Hook
 * Provides assessment data and functionality
 * Uses data from dashboard store - NO separate API call
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUserStore } from '../store/user.store';
import { useAssessmentStore } from '../store/assessment.store';
import { useDashboardStore } from '../store/dashboard.store';
import { fetchTeacherQuizzes, fetchStudentQuizzes } from '../services/dashboardApi';
import {
  createAssessment as createAssessmentApi,
  updateAssessment as updateAssessmentApi,
  deleteAssessment as deleteAssessmentApi,
} from '../api/assessment.api';
import {
  filterAssessmentsByStatus,
  canStartAssessment,
  getAssessmentStatusColor,
  getDifficultyColor,
  formatDuration,
} from '../domain/assessment.logic';
import { canCreateAssessment, canEditAssessment, canDeleteAssessment } from '../domain/permissions.logic';
import type {
  Assessment,
  StudentAssessment,
  AssessmentFilters,
  AssessmentStatus,
  User,
} from '../types';
import type { TeacherQuiz, StudentQuiz } from '../types/quiz.types';

/**
 * Hook to get current user (abstraction over store)
 */
export function useCurrentUser(): User | null {
  return useUserStore((state) => state.user);
}

/**
 * Hook to get assessment helper functions
 */
export function useAssessmentHelpers() {
  return {
    getAssessmentStatusColor,
    getDifficultyColor,
    formatDuration,
  };
}

interface UseAssessmentsReturn {
  assessments: Assessment[] | StudentAssessment[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  createAssessment: (data: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Assessment | null>;
  updateAssessment: (id: string, data: Partial<Assessment>) => Promise<Assessment | null>;
  deleteAssessment: (id: string) => Promise<boolean>;
}

/**
 * Main hook for fetching and managing assessments
 * Uses data from global dashboard store - fetched once on dashboard load
 */
export function useAssessments(filters?: AssessmentFilters): UseAssessmentsReturn {
  const user = useUserStore((state) => state.user);
  const { addAssessment, updateAssessment: updateCachedAssessment, removeAssessment } = useAssessmentStore();
  
  // Get data from global dashboard store
  const { 
    quizzes: globalQuizzes, 
    totalCount, 
    isLoading: globalLoading, 
    error: globalError,
    setQuizzes: setGlobalQuizzes,
    setLoading: setGlobalLoading,
    setError: setGlobalError,
  } = useDashboardStore();
  
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Load data from API if store is empty
  useEffect(() => {
    if (globalQuizzes.length === 0 && !globalLoading && !globalError) {
      loadData();
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;

    setGlobalLoading(true);
    try {
      if (user.role === 'instructor') {
        const response = await fetchTeacherQuizzes({ view_type: 'summary', limit: 100, offset: 0 });
        setGlobalQuizzes(response.data, response.meta?.total_count || response.data.length);
      } else {
        const response = await fetchStudentQuizzes({ view_type: 'student_total_details', limit: 100, offset: 0 });
        setGlobalQuizzes(response.data, response.meta?.total_count || response.data.length);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load assessments';
      setGlobalError(errorMsg);
      setError(errorMsg);
    } finally {
      setGlobalLoading(false);
    }
  }, [user, setGlobalQuizzes, setGlobalLoading, setGlobalError]);

  // Convert quiz data to assessment format and apply filters
  const assessments = useMemo(() => {
    if (!globalQuizzes || globalQuizzes.length === 0) {
      return [];
    }

    let filtered = globalQuizzes;

    // Apply availabilityStatus filter (for instructor)
    if (filters?.availabilityStatus && filters.availabilityStatus.length > 0) {
      filtered = filtered.filter((quiz) =>
        filters.availabilityStatus!.includes((quiz as TeacherQuiz).availability_status)
      );
    }

    // Apply status filter (for student)
    if (filters?.status && filters.status.length > 0) {
      filtered = filtered.filter((quiz) =>
        filters.status!.some((s) => {
          if (user?.role === 'student') {
            const studentQuiz = quiz as StudentQuiz;
            // Map status to student quiz fields
            if (s === 'active') return studentQuiz.availability_status === 'active';
            if (s === 'available_soon') return studentQuiz.availability_status === 'available_soon';
            if (s === 'expired') return studentQuiz.availability_status === 'expired';
          }
          return false;
        })
      );
    }

    // Transform quiz data to Assessment format
    return filtered.map((quiz) => {
      if (user?.role === 'instructor') {
        const teacherQuiz = quiz as TeacherQuiz;
        // Map quiz_type to AssessmentType
        const mapQuizType = (type: string | undefined): 'quiz' | 'exam' | 'assignment' | 'practice' => {
          if (!type) return 'quiz';
          const lowerType = type.toLowerCase();
          if (['exam', 'assignment', 'practice'].includes(lowerType)) return lowerType as any;
          return 'quiz'; // Default for ai, pdf, image, web, manual, etc.
        };

        return {
          id: String(teacherQuiz.quiz_id),
          title: teacherQuiz.quiz_name,
          description: teacherQuiz.topic,
          type: mapQuizType(teacherQuiz.quiz_type),
          status: teacherQuiz.availability_status,
          difficulty: 'medium' as const, // Default difficulty since not in API
          totalQuestions: teacherQuiz.question_count || 0,
          duration: teacherQuiz.duration || 0,
          totalMarks: teacherQuiz.question_count || 0, // Using question count as marks
          passingMarks: Math.floor((teacherQuiz.question_count || 0) * 0.4), // 40% passing
          scheduledAt: teacherQuiz.start_time,
          completedAt: teacherQuiz.end_time,
          createdAt: teacherQuiz.created_at,
          updatedAt: teacherQuiz.created_at,
        } as Assessment;
      } else {
        const studentQuiz = quiz as StudentQuiz;
        const mapQuizType = (type: string | undefined): 'quiz' | 'exam' | 'assignment' | 'practice' => {
          if (!type) return 'quiz';
          const lowerType = type.toLowerCase();
          if (['exam', 'assignment', 'practice'].includes(lowerType)) return lowerType as any;
          return 'quiz';
        };

        return {
          id: String(studentQuiz.quiz_id),
          title: studentQuiz.quiz_name,
          description: studentQuiz.topic,
          type: mapQuizType(studentQuiz.quiz_type),
          status: studentQuiz.availability_status,
          difficulty: 'medium' as const,
          totalQuestions: studentQuiz.question_count || 0,
          duration: studentQuiz.duration || 0,
          totalMarks: studentQuiz.question_count || 0,
          passingMarks: Math.floor((studentQuiz.question_count || 0) * 0.4),
          scheduledAt: studentQuiz.start_time,
          completedAt: studentQuiz.completed_at || studentQuiz.end_time,
          createdAt: studentQuiz.created_at,
          updatedAt: studentQuiz.created_at,
          isAttempted: Boolean(studentQuiz.attempt_id),
          score: studentQuiz.best_score || studentQuiz.latest_score || 0,
          percentage: studentQuiz.best_score || studentQuiz.latest_score || 0,
          attempts: studentQuiz.student_attempts || 0,
        } as StudentAssessment;
      }
    });
  }, [globalQuizzes, filters, user]);

  const refresh = useCallback(async () => {
    console.log('🔄 Refreshing assessments data');
    setOffset(0);
    await loadData();
  }, [loadData]);

  const loadMore = useCallback(async () => {
    if (!hasMore || globalLoading) return;
    
    console.log('📥 Loading more assessments');
    const newOffset = offset + ITEMS_PER_PAGE;
    setOffset(newOffset);
    
    // Check if we have more data in store
    setHasMore(newOffset < globalQuizzes.length);
  }, [hasMore, globalLoading, offset, globalQuizzes.length]);

  const createAssessment = useCallback(async (
    data: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Assessment | null> => {
    if (!canCreateAssessment(user)) {
      setError('Permission denied - only teachers can create assessments');
      return null;
    }

    try {
      const newAssessment = await createAssessmentApi(data);
      addAssessment(newAssessment);
      return newAssessment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment');
      return null;
    }
  }, [user, addAssessment]);

  const updateAssessment = useCallback(async (
    id: string,
    data: Partial<Assessment>
  ): Promise<Assessment | null> => {
    const assessment = assessments.find((a) => a.id === id) as Assessment;
    const createdBy = assessment?.createdBy ?? '';
    if (!assessment || !canEditAssessment(user, createdBy)) {
      setError('Permission denied');
      return null;
    }

    try {
      const updated = await updateAssessmentApi(id, data);
      updateCachedAssessment(id, data);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assessment');
      return null;
    }
  }, [user, assessments, updateCachedAssessment]);

  const deleteAssessment = useCallback(async (id: string): Promise<boolean> => {
    const assessment = assessments.find((a) => a.id === id) as Assessment;
    const createdBy = assessment?.createdBy ?? '';
    if (!assessment || !canDeleteAssessment(user, createdBy)) {
      setError('Permission denied');
      return false;
    }

    try {
      await deleteAssessmentApi(id);
      removeAssessment(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete assessment');
      return false;
    }
  }, [user, assessments, removeAssessment]);

  return {
    assessments,
    totalCount, // Total count from dashboard API
    isLoading: globalLoading,
    error: error || globalError,
    hasMore,
    refresh,
    loadMore,
    createAssessment,
    updateAssessment,
    deleteAssessment,
  };
}

/**
 * Hook for filtering assessments by status
 */
export function useFilteredAssessments(statuses: AssessmentStatus[]) {
  const { assessments, isLoading, error, refresh } = useAssessments();
  const [filtered, setFiltered] = useState<Assessment[]>([]);

  useEffect(() => {
    const result = filterAssessmentsByStatus(assessments as Assessment[], statuses);
    setFiltered(result);
  }, [assessments, statuses]);

  return {
    assessments: filtered,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for checking if assessment can be started
 */
export function useCanStartAssessment(assessment: Assessment | null): boolean {
  if (!assessment) return false;
  return canStartAssessment(assessment);
}
