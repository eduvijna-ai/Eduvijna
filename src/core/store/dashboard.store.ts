/**
 * Dashboard Data Store
 * Global state for dashboard data - shared across all screens
 * Data is fetched once on dashboard load and reused everywhere
 */

import { create } from 'zustand';
import { TeacherQuiz, StudentQuiz, Classroom } from '../types/quiz.types';

interface DashboardStore {
  // Data
  quizzes: TeacherQuiz[] | StudentQuiz[];
  classrooms: Classroom[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  setQuizzes: (quizzes: TeacherQuiz[] | StudentQuiz[], totalCount: number) => void;
  setClassrooms: (classrooms: Classroom[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearData: () => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Initial state
  quizzes: [],
  classrooms: [],
  totalCount: 0,
  isLoading: false,
  error: null,
  lastFetched: null,

  // Actions
  setQuizzes: (quizzes, totalCount) =>
    set({
      quizzes,
      totalCount,
      lastFetched: Date.now(),
      error: null,
    }),

  setClassrooms: (classrooms) => set({ classrooms }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  clearData: () =>
    set({
      quizzes: [],
      classrooms: [],
      totalCount: 0,
      isLoading: false,
      error: null,
      lastFetched: null,
    }),
}));
