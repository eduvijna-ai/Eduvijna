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

export interface Notice {
  id: string;
  scope: NoticeScope;
  title: string;
  body: string;
  date: string;
  author: string;
  audience: string;
  pinned?: boolean;
  scheduled?: boolean;
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
  monthLabel: string;
  paidOn: string;
  netSalary: number;
  status: 'paid' | 'pending' | 'processing';
}

export interface SalaryBreakdown {
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
}

export type LeaveType = 'CL' | 'ML' | 'EL' | 'CO';

export interface LeaveBalance {
  type: LeaveType;
  label: string;
  daysLeft: number;
  accent: ClassInfo['accent'];
}

export interface LeaveRecord {
  id: string;
  type: LeaveType;
  typeLabel: string;
  dateRange: string;
  days: number;
  status: 'approved' | 'pending' | 'rejected';
  decisionLabel: string;
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
