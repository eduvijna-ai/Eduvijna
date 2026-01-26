/**
 * Teacher Dashboard Hook - Wrapper for Singleton Store
 * 
 * Uses Zustand store to ensure data is loaded only ONCE globally
 * Multiple screens can use this hook without triggering duplicate API calls
 */

import { useEffect } from 'react';
import { useTeacherDashboardStore } from '../store/teacherDashboard.store';

export function useTeacherDashboard() {
  const {
    allQuizzes,
    classrooms,
    stats,
    weakStudents,
    uniqueStudents,
    loading,
    error,
    lastFetched,
    loadingStudents,
    loadDashboard,
    refresh,
    loadStudentListForClass,
  } = useTeacherDashboardStore();

  // Load on mount - store will skip if already loaded
  useEffect(() => {
    console.log('🎯 useTeacherDashboard hook mounted, calling loadDashboard');
    loadDashboard();
  }, [loadDashboard]);

  // Derived data
  const recentAssessments = allQuizzes
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const activeAssessments = allQuizzes.filter(
    (quiz: any) => quiz.availability_status === 'active'
  );

  return {
    // Data
    quizzes: allQuizzes,
    classrooms,
    stats,
    weakStudents,
    uniqueStudents,
    recentAssessments,
    activeAssessments,

    // State
    loading,
    error,
    lastFetched,
    loadingStudents,

    // Actions
    refresh,
    loadStudentListForClass,
  };
}
