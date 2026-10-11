import { useMemo } from 'react';
import { create } from 'zustand';
import type { DashboardStats } from '../types';
import type { StudentDashboardQuizRow as Row } from '../services/studentDashboardData.service';
import { reapplyStudentAssignmentClassification } from '../../utils/reapplyStudentAssignmentClassification';
import {
  isStudentAssignmentCompleted,
  isStudentAssignmentMissed,
  isStudentAssignmentOngoing,
} from '../../utils/studentAssignmentClassification';

type StudentAssignmentDashboardState = {
  ownerUserId: string | null;
  loadGeneration: number;
  rawQuizzes: Row[];
  classificationNow: Date;
  setRawQuizzes: (rows: Row[]) => void;
  bumpClassificationNow: () => void;
  resetForAccount: (userId: string | null) => void;
  beginLoad: (userId: string) => number;
  commitLoad: (userId: string, generation: number, rows: Row[]) => boolean;
  getClassifiedQuizzes: () => Row[];
  getStats: () => DashboardStats;
};

export const useStudentAssignmentDashboardStore = create<StudentAssignmentDashboardState>(
  (set, get) => ({
    ownerUserId: null,
    loadGeneration: 0,
    rawQuizzes: [],
    classificationNow: new Date(),
    setRawQuizzes: (rows) => set({ rawQuizzes: rows }),
    bumpClassificationNow: () => set({ classificationNow: new Date() }),
    resetForAccount: (userId) =>
      set((state) => ({
        ownerUserId: userId,
        loadGeneration: state.loadGeneration + 1,
        rawQuizzes: [],
        classificationNow: new Date(),
      })),
    beginLoad: (userId) => {
      const generation = get().loadGeneration + 1;
      set({ ownerUserId: userId, loadGeneration: generation });
      return generation;
    },
    commitLoad: (userId, generation, rows) => {
      const state = get();
      if (state.ownerUserId !== userId || state.loadGeneration !== generation) {
        return false;
      }
      set({ rawQuizzes: rows, classificationNow: new Date() });
      return true;
    },
    getClassifiedQuizzes: () => {
      const { rawQuizzes, classificationNow } = get();
      return rawQuizzes.map((quiz) =>
        reapplyStudentAssignmentClassification(quiz as any, classificationNow),
      ) as Row[];
    },
    getStats: () => {
      const classified = get().getClassifiedQuizzes();
      const completed = classified.filter((q) => isStudentAssignmentCompleted(q));
      const pending = classified.filter((q) => isStudentAssignmentOngoing(q));
      const missed = classified.filter((q) => isStudentAssignmentMissed(q));
      const scores = completed
        .filter((q) => q.score !== null && q.score !== undefined)
        .map((q) => q.score as number);
      const avgScore =
        scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      const totalTime = completed.reduce(
        (sum, q) => sum + ((q.time_spent_seconds as number) || 0),
        0,
      );
      const uniqueClasses = new Set(
        classified.map((q) => q.class_id).filter((id) => id && id !== ''),
      );
      return {
        total_quizzes: classified.length,
        completed_count: completed.length,
        pending_count: pending.length,
        missed_count: missed.length,
        average_score: avgScore != null ? Math.round(avgScore) : 0,
        total_time_spent: totalTime,
        total_questions_attempted: classified.reduce(
          (sum, q) => sum + (Number(q.question_count) || 0),
          0,
        ),
        total_classes: uniqueClasses.size,
      };
    },
  }),
);

export function resetStudentAssignmentDashboardStore(userId: string | null = null): void {
  useStudentAssignmentDashboardStore.getState().resetForAccount(userId);
}

export function selectStudentDashboardStatsFromStore(): DashboardStats {
  return useStudentAssignmentDashboardStore.getState().getStats();
}

/** Memoized stats from stable store fields (avoids getStats() reference loops in effects). */
export function useStudentAssignmentDashboardStats(): DashboardStats {
  const rawQuizzes = useStudentAssignmentDashboardStore((s) => s.rawQuizzes);
  const classificationNow = useStudentAssignmentDashboardStore((s) => s.classificationNow);
  return useMemo(
    () => useStudentAssignmentDashboardStore.getState().getStats(),
    [rawQuizzes, classificationNow],
  );
}
