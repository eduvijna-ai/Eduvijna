/**
 * ERP Schools — Admin domain models.
 *
 * Pure type definitions shared by mock fixtures (data/admin/) and admin screens.
 * No logic, no UI. When the backend is integrated these become the API response
 * shapes — screens never change (single data seam via useAdminData).
 */

import type { Ionicons } from '@expo/vector-icons';
import type { AccentKey } from '../theme/accents';
import type { Trend } from './domain';

export type IconName = keyof typeof Ionicons.glyphMap;

/** A KPI / overview metric tile. */
export interface AdminMetric {
  key: string;
  icon: IconName;
  value: string;
  label: string;
  accent: AccentKey;
  trend?: Trend;
}

export interface AdminProfile {
  name: string;
  role: string;
  schoolName: string;
  academicYear: string;
  email: string;
  phone: string;
  avatarUrl?: string;
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export interface AdminAlert {
  id: string;
  icon: IconName;
  accent: AccentKey;
  count: number;
  label: string;
}

export interface AttendancePulse {
  label: string;
  percent: number;
  accent: AccentKey;
}

export interface FeeCollectionSummary {
  collected: number;
  pending: number;
  overdue: number;
  totalLabel: string;
}

export interface AIInsight {
  id: string;
  icon: IconName;
  accent: AccentKey;
  text: string;
}

export interface PendingApproval {
  id: string;
  icon: IconName;
  accent: AccentKey;
  label: string;
  count: number;
}

export interface AdminEvent {
  id: string;
  day: string;
  month: string;
  title: string;
  meta: string;
}

// ── Charts ────────────────────────────────────────────────────────────────
export interface ChartPoint {
  label: string;
  value: number;
}

export interface DistributionRow {
  id: string;
  label: string;
  value: string;
  percent: number;
  color: 'success' | 'warning' | 'danger' | 'info' | 'primary';
}

export interface CriteriaRow {
  id: string;
  label: string;
  icon: IconName;
  percent: number;
}

export interface RankedRow {
  id: string;
  rank: number;
  label: string;
  value: string;
  trend: Trend;
}

// ── People ──────────────────────────────────────────────────────────────────
export type PersonStatus = 'active' | 'absent' | 'leave' | 'inactive';

export interface DirectoryPerson {
  id: string;
  name: string;
  subtitle: string;
  meta: string;
  value: string;
  status: PersonStatus;
  accent: AccentKey;
  avatarUrl?: string;
}

export interface AdminRoleItem {
  id: string;
  name: string;
  icon: IconName;
  accent: AccentKey;
  userCount: number;
  description: string;
}

export interface PermissionItem {
  id: string;
  label: string;
  description: string;
  granted: boolean;
}

export interface PermissionGroup {
  id: string;
  title: string;
  icon: IconName;
  accent: AccentKey;
  permissions: PermissionItem[];
}

// ── Academics ────────────────────────────────────────────────────────────────
export interface AdminClass {
  id: string;
  subject: string;
  grade: string;
  room: string;
  teacher: string;
  timeLabel: string;
  syllabusPercent: number;
  icon: IconName;
  accent: AccentKey;
}

export type ExamState = 'upcoming' | 'ongoing' | 'completed';

export interface AdminExam {
  id: string;
  title: string;
  grade: string;
  subject: string;
  day: string;
  month: string;
  weekday: string;
  timeLabel: string;
  state: ExamState;
  badgeLabel: string;
  averageScore?: number;
}

export interface ReportEntry {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  accent: AccentKey;
  fileType: 'PDF' | 'Excel';
  dateLabel: string;
}

export interface ReportCategory {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  accent: AccentKey;
  count: number;
}

// ── Admissions ───────────────────────────────────────────────────────────────
export type ApplicationStatus = 'new' | 'review' | 'approved' | 'rejected' | 'waitlist';

export interface AdmissionApplication {
  id: string;
  applicantName: string;
  grade: string;
  appliedOn: string;
  guardian: string;
  status: ApplicationStatus;
}

export interface WorkflowItem {
  id: string;
  title: string;
  subtitle: string;
  requestedBy: string;
  dateLabel: string;
  icon: IconName;
  accent: AccentKey;
}

// ── Finance ──────────────────────────────────────────────────────────────────
export type FeeRecordStatus = 'paid' | 'pending' | 'overdue';

export interface FeeRecord {
  id: string;
  studentName: string;
  studentId: string;
  grade: string;
  dueLabel: string;
  amount: number;
  status: FeeRecordStatus;
}

export interface Transaction {
  id: string;
  name: string;
  meta: string;
  method: string;
  amount: number;
  dateLabel: string;
}

export interface FeeTypeRow {
  id: string;
  label: string;
  amountLabel: string;
  percentLabel: string;
  icon: IconName;
  accent: AccentKey;
}

// ── Operations ───────────────────────────────────────────────────────────────
export interface OpsListRow {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  status?: PersonStatus;
  icon: IconName;
  accent: AccentKey;
}

// ── Notifications & Announcements ─────────────────────────────────────────────
export type AnnouncementCategory = 'general' | 'academics' | 'events' | 'exams' | 'transport';

export interface AdminAnnouncement {
  id: string;
  category: AnnouncementCategory;
  categoryLabel: string;
  title: string;
  body: string;
  dateLabel: string;
  author: string;
  icon: IconName;
  accent: AccentKey;
  pinned?: boolean;
}

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  icon: IconName;
  accent: AccentKey;
  read: boolean;
}
