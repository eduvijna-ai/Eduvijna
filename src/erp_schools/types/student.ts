/**
 * ERP Schools — Student domain models.
 *
 * Pure type definitions shared by mock fixtures (data/student/) and student
 * screens. No logic, no UI. When the backend is integrated these become the API
 * response shapes — screens never change (single data seam via useStudentData).
 */

import type { AccentKey } from '../theme/accents';

export interface StudentProfile {
  name: string;
  className: string;
  rollNo: string;
  admissionNo: string;
  academicYear: string;
  attendancePercent: number;
  averageMarks: number;
  classRank: number;
  classStrength: number;
  avatarUrl?: string;
  guardianName: string;
  dateOfBirth: string;
  bloodGroup: string;
  email: string;
  phone: string;
  address: string;
}

export type StudentAttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface AttendanceBucket {
  key: 'present' | 'absent' | 'leave' | 'total';
  label: string;
  value: string;
  sublabel: string;
  icon: string;
  accent: AccentKey;
}

export interface AttendanceTrendPoint {
  label: string;
  percent: number;
}

export interface AttendanceDayRecord {
  id: string;
  day: number;
  month: string;
  status: StudentAttendanceStatus;
  weekday: string;
  note?: string;
}

export interface SubjectMark {
  id: string;
  subject: string;
  icon: string;
  accent: AccentKey;
  periodicTest: string;
  notebook: string;
  enrichment: string;
  examination: string;
  total: string;
  percent: number;
  grade: string;
}

export interface MarksDistributionBand {
  range: string;
  count: number;
  color: 'success' | 'info' | 'warning' | 'danger';
}

export interface TermScorePoint {
  label: string;
  percent: number;
}

export interface AssessmentBreakdownRow {
  type: string;
  maxMarks: number;
  obtained: number;
  percent: number;
  grade: string;
}

export interface AssessmentDetailItem {
  id: string;
  title: string;
  type: string;
  icon: string;
  accent: AccentKey;
  obtained: number;
  maxMarks: number;
  percent: number;
  grade: string;
}

export type StudentAssignmentStatus = 'pending' | 'submitted' | 'overdue' | 'graded';

export interface StudentAssignment {
  id: string;
  title: string;
  subject: string;
  description: string;
  icon: string;
  accent: AccentKey;
  dueLabel: string;
  status: StudentAssignmentStatus;
  submittedLabel?: string;
  marks?: number;
  maxMarks?: number;
}

export interface SubjectPerformance {
  id: string;
  subject: string;
  icon: string;
  accent: AccentKey;
  completed: number;
  total: number;
  percent: number;
}

export type TimetableSlotKind = 'period' | 'break';

export interface TimetableSlot {
  id: string;
  periodNo?: number;
  startTime: string;
  endTime: string;
  kind: TimetableSlotKind;
  subject?: string;
  topic?: string;
  teacher?: string;
  room?: string;
  icon?: string;
  accent?: AccentKey;
}

export interface TimetableDay {
  key: string;
  weekday: string;
  dateLabel: string;
  isToday?: boolean;
  slots: TimetableSlot[];
}

export type ExamState = 'upcoming' | 'ongoing' | 'completed';

export interface ExamScheduleItem {
  id: string;
  subject: string;
  icon: string;
  accent: AccentKey;
  dateLabel: string;
  timeLabel: string;
  room: string;
  durationLabel: string;
  state: ExamState;
}

export interface ExamResultItem {
  id: string;
  subject: string;
  icon: string;
  accent: AccentKey;
  obtained: number;
  maxMarks: number;
  percent: number;
  grade: string;
}

export type FeeInstallmentStatus = 'paid' | 'pending' | 'overdue';

export interface FeeInstallment {
  id: string;
  index: number;
  label: string;
  dueDate: string;
  amount: number;
  status: FeeInstallmentStatus;
  paidDate?: string;
}

export interface FeePayment {
  id: string;
  label: string;
  method: string;
  amount: number;
  date: string;
}

export interface FeeBreakupRow {
  id: string;
  label: string;
  icon: string;
  amount: number;
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  category: string;
  rating: number;
  coverColor: string;
  isEbook?: boolean;
}

export interface LibraryCategory {
  id: string;
  label: string;
  icon: string;
  accent: AccentKey;
  count: number;
}

export interface IssuedBook {
  id: string;
  title: string;
  author: string;
  issuedOn: string;
  dueOn: string;
  daysLeft: number;
}

export type NoticeCategory = 'school' | 'class' | 'circular' | 'urgent';

export interface StudentNotice {
  id: string;
  category: NoticeCategory;
  title: string;
  body: string;
  author: string;
  dateLabel: string;
  timeLabel: string;
  icon: string;
  accent: AccentKey;
  pinned?: boolean;
}

export type EventCategory = 'school' | 'academic' | 'sports' | 'competition' | 'holiday';

export interface StudentEvent {
  id: string;
  title: string;
  category: EventCategory;
  categoryLabel: string;
  day: string;
  month: string;
  weekday: string;
  timeLabel: string;
  location: string;
  icon: string;
  accent: AccentKey;
  completed?: boolean;
}

export interface StudentNotification {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  icon: string;
  accent: AccentKey;
  read: boolean;
}

export interface StudentScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  room: string;
  teacher: string;
  status: 'completed' | 'upcoming' | 'ongoing';
}

export interface StudentAnnouncement {
  id: string;
  title: string;
  body: string;
  date: string;
  isNew?: boolean;
}

export interface StudentDashboardOverview {
  attendancePercent: number;
  averageMarks: number;
  classRank: number;
  totalAssignments: number;
  pendingAssignments: number;
}
