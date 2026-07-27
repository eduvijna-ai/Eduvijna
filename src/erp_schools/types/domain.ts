/**
 * ERP Schools — Teacher domain models.
 *
 * Pure type definitions shared by mock fixtures (data/) and screens. No logic,
 * no UI. When the backend is integrated, these become the API response shapes.
 */

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'half_day';

export type SelfAttendanceStatus = 'present' | 'absent' | 'late' | 'half_day';

export type TrendDirection = 'up' | 'down' | 'flat';

export interface Trend {
  direction: TrendDirection;
  label: string;
}

export interface ClassInfo {
  id: string;
  /** e.g. "8-A" */
  code: string;
  /** e.g. "Class 8-A" */
  name: string;
  subject: string;
  room: string;
  studentCount: number;
  periodsPerWeek: number;
  /** Tint key for the avatar bubble. */
  accent: 'teal' | 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'red';
  /** Web Class Overview assignment fields */
  className?: string;
  sectionName?: string;
  teacherName?: string;
  classTeacherName?: string;
  classId?: number;
  sectionId?: number | null;
  subjectId?: number | null;
}

/** Web Class Overview KPI tile values (filter-reactive). */
export interface ClassOverviewKpis {
  classes: number;
  students: number;
  teachers: number;
  subjects: number;
  weeklyPeriods: number;
}

export interface StudentInfo {
  id: string;
  /** e.g. "S8123" */
  rollNo: string;
  name: string;
  classCode: string;
  avatarUrl?: string;
  attendanceStatus?: AttendanceStatus;
  attendancePercent?: number;
  averageScore?: number;
  guardianName?: string;
  guardianRelation?: string;
  /** Web students-by-user fields */
  profileId?: number | null;
  userId?: number | null;
  className?: string;
  sectionName?: string;
  subjectName?: string;
  classId?: number | null;
  sectionId?: number | null;
  gender?: string;
  admissionNumber?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  city?: string;
  apaarId?: string;
}

export interface SchedulePeriod {
  id: string;
  startTime: string;
  endTime: string;
  classCode: string;
  subject: string;
  room: string;
}

export type TimetableEntryKind = 'period' | 'break';

export interface TimetableEntry {
  id: string;
  periodNo?: number;
  startTime: string;
  endTime: string;
  kind: TimetableEntryKind;
  subject?: string;
  topic?: string;
  room?: string;
  accent?: ClassInfo['accent'];
  iconName?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  isNew?: boolean;
  scope?: 'class' | 'group' | 'school';
}

export type AssignmentStatus = 'active' | 'closed' | 'scheduled' | 'draft';

export interface Assignment {
  id: string;
  title: string;
  classCode: string;
  subject: string;
  dueDate: string;
  status: AssignmentStatus;
  submitted: number;
  pending: number;
  total: number;
}

export interface AssignmentSubmission {
  id: string;
  student: StudentInfo;
  submittedAt?: string;
  status: 'submitted' | 'pending' | 'late' | 'graded';
  marks?: number;
  maxMarks: number;
}

export type AssessmentState = 'upcoming' | 'ongoing' | 'completed';

export interface Assessment {
  id: string;
  title: string;
  classCode: string;
  subject: string;
  date: string;
  maxMarks: number;
  state: AssessmentState;
  averageScore?: number;
  graded: number;
  total: number;
}

export type MaterialType = 'pdf' | 'ppt' | 'doc' | 'video' | 'link' | 'other';

export interface StudyMaterialItem {
  id: string;
  title: string;
  type: MaterialType;
  sizeLabel: string;
  date: string;
  author: string;
  sharedWithClass: boolean;
}

export type NoticeScope = 'class' | 'group' | 'school';

/** Web NoticesTab categories. */
export type NoticeCategory =
  | 'general'
  | 'academic'
  | 'fee'
  | 'event'
  | 'exam'
  | 'holiday';

export const NOTICE_CATEGORIES: NoticeCategory[] = [
  'general',
  'academic',
  'fee',
  'event',
  'exam',
  'holiday',
];

export interface Notice {
  id: string;
  /** Numeric ERP notice id for update/delete */
  noticeId: number;
  scope: NoticeScope;
  category: NoticeCategory | string;
  title: string;
  body: string;
  date: string;
  publishDate?: string;
  expiryDate?: string;
  author: string;
  audience: string;
  pinned?: boolean;
  scheduled?: boolean;
  isActive?: boolean;
}

export interface Conversation {
  id: string;
  parentName: string;
  parentRelation: 'Mother' | 'Father' | 'Guardian' | 'Group';
  studentName: string;
  studentRollNo?: string;
  preview: string;
  timeLabel: string;
  unread: number;
  avatarUrl?: string;
  isGroup?: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  timeLabel: string;
  fromMe: boolean;
}

export interface CalendarDayMark {
  /** ISO date yyyy-mm-dd */
  date: string;
  status: SelfAttendanceStatus;
}

export interface PayslipSummary {
  id: string;
  /** Numeric ERP payslip id */
  payslipId: number;
  monthLabel: string;
  month?: number;
  year?: number;
  paidOn: string;
  netSalary: number;
  grossSalary?: number;
  basicSalary?: number;
  status: 'paid' | 'pending' | 'processing' | 'draft' | 'generated' | 'approved' | 'cancelled';
  paymentMethod?: string;
  employeeCode?: string;
  staffName?: string;
  department?: string;
  designation?: string;
  /** Full line items for detail view */
  earnings?: {
    basic: number;
    hra: number;
    da: number;
    ta: number;
    otherAllowances: number;
    total: number;
  };
  deductions?: {
    pf: number;
    tax: number;
    other: number;
    total: number;
  };
}

export interface SalaryBreakdown {
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
}

export type LeaveType = 'CL' | 'ML' | 'EL' | 'CO';

export interface LeaveBalance {
  /** Stable unique id for list keys (leave type id from API). */
  id: string;
  type: LeaveType;
  label: string;
  daysLeft: number;
  maxDays?: number;
  accent: ClassInfo['accent'];
}

export interface LeaveRecord {
  id: string;
  leaveId: number;
  leaveTypeId?: number;
  type: LeaveType;
  typeLabel: string;
  dateRange: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason?: string;
  halfDay?: 'first' | 'second' | null;
  applyDate?: string;
  status: 'approved' | 'pending' | 'rejected' | 'cancelled';
  decisionLabel: string;
  isActive?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  iconName: string;
  accent: ClassInfo['accent'];
  read: boolean;
}

export interface TeacherProfile {
  name: string;
  role: string;
  employeeId: string;
  email: string;
  phone: string;
  subjects: string[];
  joinedOn: string;
  avatarUrl?: string;
}

export interface AttendanceSummaryBucket {
  status: AttendanceStatus;
  label: string;
  count: number;
  percent: number;
}

export interface ScoreBucket {
  range: string;
  count: number;
}
