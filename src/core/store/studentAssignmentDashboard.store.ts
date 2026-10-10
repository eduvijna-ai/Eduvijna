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
  rawQuizzes: Row[];
  classificationNow: Date;
  setRawQuizzes: (rows: Row[]) => void;
  bumpClassificationNow: () => void;
  getClassifiedQuizzes: () => Row[];
  getStats: () => DashboardStats;
};

export const useStudentAssignmentDashboardStore = create<StudentAssignmentDashboardState>(
  (set, get) => ({
    rawQuizzes: [],
    classificationNow: new Date(),
    setRawQuizzes: (rows) => set({ rawQuizzes: rows }),
    bumpClassificationNow: () => set({ classificationNow: new Date() }),
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

export function selectStudentDashboardStatsFromStore(): DashboardStats {
  return useStudentAssignmentDashboardStore.getState().getStats();
}
