/** Exams module enums — web ExamsTab / ExamGroupsSubView parity. */

export const EXAM_TABS = [
  { key: 'groups', label: 'Exam Groups', icon: 'folder-outline' as const },
  { key: 'exams', label: 'Exams', icon: 'school-outline' as const },
  { key: 'schedules', label: 'Schedules', icon: 'calendar-outline' as const },
  { key: 'marks', label: 'Marks', icon: 'create-outline' as const },
  { key: 'results', label: 'Results', icon: 'trophy-outline' as const },
  { key: 'documents', label: 'Report Cards', icon: 'document-text-outline' as const },
] as const;

export type ExamTabKey = (typeof EXAM_TABS)[number]['key'];

export const EXAM_GROUP_TYPES = [
  'General',
  'Grade',
  'Semester',
  'Unit',
  'Annual',
  'Monthly',
  'Other',
] as const;

export const ROLL_NUMBER_TYPES = [
  { label: 'Admit card', value: 'admit_card' },
  { label: 'Profile', value: 'profile' },
] as const;

export const GRADE_TEMPLATES = [
  { key: 'cbse', label: 'CBSE' },
  { key: 'percentage', label: 'Percentage' },
  { key: 'gpa', label: 'GPA' },
] as const;

export function statusTone(
  status?: string,
): 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'teal' | 'pink' {
  const s = (status || '').toLowerCase();
  if (['published', 'pass', 'present', 'active'].includes(s)) return 'green';
  if (['draft', 'empty', 'not published', 'partial'].includes(s)) return 'orange';
  if (['fail', 'absent', 'cancelled'].includes(s)) return 'red';
  if (['upcoming', 'scheduled'].includes(s)) return 'blue';
  return 'teal';
}

export function formatExamTime(start?: string | null, durationMins?: number | null): string {
  if (!start) return '—';
  const raw = String(start).slice(0, 5);
  if (!durationMins || durationMins <= 0) return raw;
  const [h, m] = raw.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return raw;
  const endTotal = h * 60 + m + durationMins;
  const eh = Math.floor(endTotal / 60) % 24;
  const em = endTotal % 60;
  return `${raw} to ${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

export function formatExamDateLabel(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    weekday: 'long',
  });
}
