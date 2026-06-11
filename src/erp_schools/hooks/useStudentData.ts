/**
 * useStudentData — the single read seam between Student screens and the data
 * source (mirrors useTeacherData).
 *
 * Today it returns static mock fixtures. To integrate the backend later, back
 * these selectors with `@core/api` (or React Query) — screens never change.
 */

import {
  studentProfile,
  academicYears,
  studentOverview,
  todaysSchedule,
  studentAnnouncements,
  attendanceBuckets,
  attendanceTrend,
  recentAttendance,
  attendanceOverallPercent,
  academicSummary,
  subjectMarks,
  marksDistribution,
  termComparison,
  detailedReportSummary,
  assessmentBreakdown,
  assessmentDetails,
  assignmentStats,
  studentAssignments,
  performanceStats,
  performanceDistribution,
  subjectPerformance,
  timetableWeek,
  schoolTiming,
  examSchedule,
  examResultsSummary,
  examResults,
  feeSummary,
  feeInstallments,
  feePayments,
  feeBreakup,
  libraryCategories,
  recommendedBooks,
  ebooks,
  issuedBooks,
  studentNotices,
  studentEvents,
  recentEvents,
  studentNotifications,
} from '../data/student';
import type { SubjectMark, StudentAssignment } from '../types/student';

export function useStudentData() {
  return {
    profile: studentProfile,
    academicYears,
    overview: studentOverview,
    schedule: todaysSchedule,
    announcements: studentAnnouncements,

    attendance: {
      buckets: attendanceBuckets,
      trend: attendanceTrend,
      recent: recentAttendance,
      overallPercent: attendanceOverallPercent,
    },

    academics: {
      summary: academicSummary,
      subjects: subjectMarks,
      distribution: marksDistribution,
      termComparison,
      detailedReportSummary,
      assessmentBreakdown,
      assessmentDetails,
    },

    assignments: {
      stats: assignmentStats,
      list: studentAssignments,
      performanceStats,
      performanceDistribution,
      subjectPerformance,
    },

    timetable: {
      week: timetableWeek,
      timing: schoolTiming,
    },

    exams: {
      schedule: examSchedule,
      resultsSummary: examResultsSummary,
      results: examResults,
    },

    fees: {
      summary: feeSummary,
      installments: feeInstallments,
      payments: feePayments,
      breakup: feeBreakup,
    },

    library: {
      categories: libraryCategories,
      recommended: recommendedBooks,
      ebooks,
      issued: issuedBooks,
    },

    notices: studentNotices,
    events: { upcoming: studentEvents, recent: recentEvents },
    notifications: studentNotifications,

    getSubjectById(subjectId?: string): SubjectMark | undefined {
      if (!subjectId) return subjectMarks[0];
      return subjectMarks.find((s) => s.id === subjectId) ?? subjectMarks[0];
    },
    getAssignmentById(assignmentId?: string): StudentAssignment | undefined {
      if (!assignmentId) return studentAssignments[0];
      return studentAssignments.find((a) => a.id === assignmentId) ?? studentAssignments[0];
    },
  };
}
