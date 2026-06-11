/**
 * useTeacherData — the single read seam between screens and the data source.
 *
 * Today it returns static mock fixtures. To integrate the backend later, back
 * these selectors with `@core/api` (or React Query) — screens never change.
 */

import {
  teacherClasses,
  classesSummary,
  rosterByClass,
  allStudents,
  todaysSchedule,
  recentAnnouncements,
  dashboardOverview,
} from '../data';
import type { ClassInfo, StudentInfo } from '../types/domain';

export function useTeacherData() {
  return {
    classes: teacherClasses,
    classesSummary,
    students: allStudents,
    schedule: todaysSchedule,
    announcements: recentAnnouncements,
    overview: dashboardOverview,
    getClassById(classId?: string): ClassInfo | undefined {
      if (!classId) return teacherClasses[0];
      return teacherClasses.find((c) => c.id === classId) ?? teacherClasses[0];
    },
    getRoster(classCode: string): StudentInfo[] {
      return rosterByClass[classCode] ?? [];
    },
    getStudentById(studentId?: string): StudentInfo | undefined {
      if (!studentId) return allStudents[0];
      return allStudents.find((s) => s.id === studentId) ?? allStudents[0];
    },
  };
}
