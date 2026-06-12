/** Admin mock fixtures — academics (overview, classes, exams, reports). */

import type {
  AdminMetric,
  ChartPoint,
  DistributionRow,
  RankedRow,
  AdminClass,
  AdminExam,
  ReportEntry,
  ReportCategory,
} from '../../types/admin';

// ── Academic overview ────────────────────────────────────────────────────
export const academicKpis: AdminMetric[] = [
  { key: 'pass', icon: 'pie-chart-outline', value: '84%', label: 'Pass Percentage', accent: 'teal', trend: { direction: 'up', label: '5.1%' } },
  { key: 'avg', icon: 'people-outline', value: '75.8%', label: 'Average Marks', accent: 'blue', trend: { direction: 'up', label: '2.1%' } },
  { key: 'assess', icon: 'clipboard-outline', value: '1,250', label: 'Assessments', accent: 'purple', trend: { direction: 'up', label: '12.5%' } },
  { key: 'risk', icon: 'warning-outline', value: '312', label: 'Students At Risk', accent: 'red', trend: { direction: 'down', label: '2.4%' } },
];

export const academicTrend: ChartPoint[] = [
  { label: 'Jan', value: 72 },
  { label: 'Feb', value: 74 },
  { label: 'Mar', value: 73 },
  { label: 'Apr', value: 76 },
  { label: 'May', value: 77 },
  { label: 'Jun', value: 76 },
];

export const academicGradeMarks: ChartPoint[] = [
  { label: 'G6', value: 44 },
  { label: 'G7', value: 72 },
  { label: 'G8', value: 76 },
  { label: 'G9', value: 78 },
  { label: 'G10', value: 82 },
];

export const academicSubjectPerf: DistributionRow[] = [
  { id: 'math', label: 'Mathematics', value: '86%', percent: 86, color: 'primary' },
  { id: 'sci', label: 'Science', value: '82%', percent: 82, color: 'primary' },
  { id: 'eng', label: 'English', value: '78%', percent: 78, color: 'primary' },
  { id: 'soc', label: 'Social Studies', value: '74%', percent: 74, color: 'primary' },
  { id: 'cs', label: 'Computer Science', value: '89%', percent: 89, color: 'primary' },
];

export const academicDistribution: DistributionRow[] = [
  { id: 'd1', label: '90% and above', value: '18% (442)', percent: 18, color: 'success' },
  { id: 'd2', label: '75% - 89%', value: '25% (613)', percent: 25, color: 'info' },
  { id: 'd3', label: '60% - 74%', value: '28% (686)', percent: 28, color: 'warning' },
  { id: 'd4', label: 'Below 60%', value: '22% (542)', percent: 22, color: 'danger' },
];

export const topClasses: RankedRow[] = [
  { id: 'c1', rank: 1, label: 'Grade 10-A', value: '88.2%', trend: { direction: 'up', label: '96% pass' } },
  { id: 'c2', rank: 2, label: 'Grade 9-A', value: '82.4%', trend: { direction: 'up', label: '93% pass' } },
  { id: 'c3', rank: 3, label: 'Grade 8-B', value: '78.7%', trend: { direction: 'up', label: '89% pass' } },
  { id: 'c4', rank: 4, label: 'Grade 7-A', value: '72.1%', trend: { direction: 'flat', label: '85% pass' } },
  { id: 'c5', rank: 5, label: 'Grade 6-C', value: '68.3%', trend: { direction: 'down', label: '82% pass' } },
];

// ── Classes ──────────────────────────────────────────────────────────────
export const adminClasses: AdminClass[] = [
  { id: 'cl1', subject: 'Mathematics', grade: '10-A', room: 'Room 204', teacher: 'Mr. Rajesh Kumar', timeLabel: 'Mon, Wed, Fri • 09:00 AM', syllabusPercent: 85, icon: 'book-outline', accent: 'purple' },
  { id: 'cl2', subject: 'Science', grade: '10-A', room: 'Room 301', teacher: 'Ms. Priya Singh', timeLabel: 'Tue, Thu, Sat • 10:15 AM', syllabusPercent: 72, icon: 'flask-outline', accent: 'green' },
  { id: 'cl3', subject: 'English', grade: '10-A', room: 'Room 102', teacher: 'Mr. Arvind Sharma', timeLabel: 'Mon, Tue, Thu • 11:30 AM', syllabusPercent: 68, icon: 'book-outline', accent: 'orange' },
  { id: 'cl4', subject: 'Social Studies', grade: '10-A', room: 'Room 205', teacher: 'Ms. Kavita Joshi', timeLabel: 'Wed, Fri • 01:00 PM', syllabusPercent: 60, icon: 'globe-outline', accent: 'blue' },
  { id: 'cl5', subject: 'Computer Science', grade: '10-A', room: 'Room Lab 1', teacher: 'Mr. Rohan Verma', timeLabel: 'Tue, Fri • 02:15 PM', syllabusPercent: 90, icon: 'desktop-outline', accent: 'pink' },
];

export const classOverviewKpis: AdminMetric[] = [
  { key: 'total', icon: 'easel-outline', value: '5', label: 'Total Classes', accent: 'teal' },
  { key: 'teachers', icon: 'people-outline', value: '6', label: 'Teachers', accent: 'purple' },
  { key: 'progress', icon: 'trending-up-outline', value: '85%', label: 'Avg Progress', accent: 'green' },
  { key: 'upcoming', icon: 'calendar-outline', value: '28', label: 'Upcoming Classes', accent: 'blue' },
];

// ── Exams ──────────────────────────────────────────────────────────────────
export const examKpis: AdminMetric[] = [
  { key: 'upcoming', icon: 'calendar-outline', value: '12', label: 'Upcoming', accent: 'green' },
  { key: 'ongoing', icon: 'time-outline', value: '5', label: 'Ongoing', accent: 'purple' },
  { key: 'completed', icon: 'checkbox-outline', value: '18', label: 'Completed', accent: 'orange' },
  { key: 'score', icon: 'bar-chart-outline', value: '75%', label: 'Average Score', accent: 'pink' },
];

export const upcomingExams: AdminExam[] = [
  { id: 'ex1', title: 'Unit Test - 1', grade: 'Grade 6-A', subject: 'Mathematics', day: '20', month: 'Jun', weekday: 'Fri', timeLabel: '09:00 AM - 11:00 AM', state: 'upcoming', badgeLabel: 'In 2 Days' },
  { id: 'ex2', title: 'Mid Term Examination', grade: 'Grade 8-B', subject: 'Science', day: '24', month: 'Jun', weekday: 'Tue', timeLabel: '09:00 AM - 12:00 PM', state: 'upcoming', badgeLabel: 'In 6 Days' },
  { id: 'ex3', title: 'Unit Test - 1', grade: 'Grade 7-A', subject: 'English', day: '28', month: 'Jun', weekday: 'Sat', timeLabel: '09:00 AM - 11:00 AM', state: 'upcoming', badgeLabel: 'In 10 Days' },
  { id: 'ex4', title: 'Pre-Board Examination', grade: 'Grade 10-A', subject: 'All Subjects', day: '02', month: 'Jul', weekday: 'Wed', timeLabel: '09:00 AM - 01:00 PM', state: 'upcoming', badgeLabel: 'In 14 Days' },
];

export const ongoingExams: AdminExam[] = [
  { id: 'ex5', title: 'Mid Term Examination', grade: 'Grade 9 - All Sections', subject: 'All Subjects', day: '10', month: 'Jun', weekday: 'Mon', timeLabel: '10 Jun - 18 Jun 2026', state: 'ongoing', badgeLabel: 'Ongoing' },
];

export const recentExamResults: AdminExam[] = [
  { id: 'ex6', title: 'Quarterly Examination', grade: 'Grade 6 - All Sections', subject: 'All Subjects', day: '25', month: 'May', weekday: 'Sun', timeLabel: 'Completed on 25 May 2026', state: 'completed', badgeLabel: 'Done', averageScore: 78 },
  { id: 'ex7', title: 'Unit Test - 2', grade: 'Grade 7 - All Sections', subject: 'All Subjects', day: '20', month: 'May', weekday: 'Tue', timeLabel: 'Completed on 20 May 2026', state: 'completed', badgeLabel: 'Done', averageScore: 82 },
  { id: 'ex8', title: 'Mid Term Examination', grade: 'Grade 8 - All Sections', subject: 'All Subjects', day: '15', month: 'May', weekday: 'Thu', timeLabel: 'Completed on 15 May 2026', state: 'completed', badgeLabel: 'Done', averageScore: 86 },
];

// ── Reports ──────────────────────────────────────────────────────────────
export const academicReportKpis: AdminMetric[] = [
  { key: 'total', icon: 'document-text-outline', value: '8', label: 'Total Reports', accent: 'teal' },
  { key: 'sched', icon: 'calendar-outline', value: '3', label: 'Scheduled', accent: 'blue' },
  { key: 'down', icon: 'download-outline', value: '12', label: 'Downloaded', accent: 'purple' },
  { key: 'shared', icon: 'share-social-outline', value: '4', label: 'Shared', accent: 'orange' },
];

export const academicReports: ReportEntry[] = [
  { id: 'ar1', title: 'Class Performance Report', description: 'Overall performance of each class across subjects.', icon: 'bar-chart-outline', accent: 'green', fileType: 'PDF', dateLabel: '15 Jun 2026' },
  { id: 'ar2', title: 'Subject Performance Report', description: 'Subject-wise analysis of performance & improvement.', icon: 'book-outline', accent: 'blue', fileType: 'PDF', dateLabel: '14 Jun 2026' },
  { id: 'ar3', title: 'Assessment Analysis Report', description: 'Detailed analysis of assessments & average marks.', icon: 'clipboard-outline', accent: 'purple', fileType: 'Excel', dateLabel: '13 Jun 2026' },
  { id: 'ar4', title: 'Learning Outcomes Report', description: 'Learning outcomes achieved based on curriculum goals.', icon: 'school-outline', accent: 'orange', fileType: 'PDF', dateLabel: '12 Jun 2026' },
  { id: 'ar5', title: 'Grade Analysis Report', description: 'Grade distribution & comparison across classes.', icon: 'ribbon-outline', accent: 'teal', fileType: 'PDF', dateLabel: '11 Jun 2026' },
  { id: 'ar6', title: 'Term Summary Report', description: 'Comprehensive academic summary for the term.', icon: 'stats-chart-outline', accent: 'pink', fileType: 'PDF', dateLabel: '10 Jun 2026' },
];

export const reportCategories: ReportCategory[] = [
  { id: 'rc1', title: 'Academics', description: 'Performance, results, assessments & learning analytics', icon: 'school-outline', accent: 'purple', count: 8 },
  { id: 'rc2', title: 'Attendance', description: 'Attendance summary, trends & detailed analysis', icon: 'calendar-outline', accent: 'green', count: 6 },
  { id: 'rc3', title: 'Finance', description: 'Fee collection, dues, concessions & transactions', icon: 'wallet-outline', accent: 'orange', count: 10 },
  { id: 'rc4', title: 'Students', description: 'Directory, admission, demographics & progress', icon: 'people-outline', accent: 'blue', count: 9 },
  { id: 'rc5', title: 'Teachers', description: 'Workload, attendance, performance & development', icon: 'person-outline', accent: 'pink', count: 7 },
  { id: 'rc6', title: 'Examinations', description: 'Schedules, results, grade analysis & topper reports', icon: 'clipboard-outline', accent: 'purple', count: 6 },
  { id: 'rc7', title: 'Transport', description: 'Transport usage, route-wise report & attendance', icon: 'bus-outline', accent: 'teal', count: 5 },
  { id: 'rc8', title: 'Hostel', description: 'Occupancy, fees, leave record & mess report', icon: 'business-outline', accent: 'blue', count: 5 },
];

export const recentReports: ReportEntry[] = [
  { id: 'rr1', title: 'Monthly Academic Performance - May 2026', description: 'Academics', icon: 'bar-chart-outline', accent: 'purple', fileType: 'PDF', dateLabel: '15 Jun 2026 10:30 AM' },
  { id: 'rr2', title: 'Daily Attendance Summary - 15 Jun 2026', description: 'Attendance', icon: 'calendar-outline', accent: 'green', fileType: 'Excel', dateLabel: '15 Jun 2026 09:15 AM' },
  { id: 'rr3', title: 'Fee Collection Report - May 2026', description: 'Finance', icon: 'wallet-outline', accent: 'orange', fileType: 'PDF', dateLabel: '14 Jun 2026 06:20 PM' },
  { id: 'rr4', title: 'Students at Risk Report', description: 'Students', icon: 'people-outline', accent: 'blue', fileType: 'PDF', dateLabel: '14 Jun 2026 03:40 PM' },
  { id: 'rr5', title: 'Teacher Performance Report - May 2026', description: 'Teachers', icon: 'person-outline', accent: 'pink', fileType: 'Excel', dateLabel: '13 Jun 2026 11:10 AM' },
];

export const reportAnalyticsKpis: AdminMetric[] = [
  { key: 'gen', icon: 'document-text-outline', value: '48', label: 'Generated', accent: 'green', trend: { direction: 'up', label: '33%' } },
  { key: 'sched', icon: 'calendar-outline', value: '12', label: 'Scheduled', accent: 'purple', trend: { direction: 'up', label: '20%' } },
  { key: 'down', icon: 'download-outline', value: '156', label: 'Downloaded', accent: 'blue', trend: { direction: 'up', label: '28%' } },
  { key: 'shared', icon: 'share-social-outline', value: '32', label: 'Shared', accent: 'orange', trend: { direction: 'up', label: '14%' } },
];
