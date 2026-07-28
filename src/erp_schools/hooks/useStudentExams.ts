/**
 * useStudentExams — web ExamsTab StudentExamSchedule + mySubjectPerformance parity.
 * APIs: examAllItemsApi.mySchedule, examAllItemsApi.mySubjectPerformance
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { examAllItemsApi } from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import { formatExamDateLabel, formatExamTime } from '../utils/examMeta';
import { examResults, examResultsSummary, examSchedule } from '../data/student/exams';
import { useSchoolsSession } from './useSchoolsSession';

export type StudentExamRow = {
  id: string;
  examItemId: number;
  examName: string;
  examGroupName: string;
  session: string;
  subjectName: string;
  className: string;
  examDate: string;
  startTime: string;
  durationMins: number;
  roomNo: string;
  maxMarks: number;
  state: 'upcoming' | 'ongoing' | 'completed';
  icon: string;
  accent: 'teal' | 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'red';
};

export type StudentExamPerfRow = {
  id: string;
  subject: string;
  percent: number;
  obtained: number;
  maxMarks: number;
  grade: string;
  examCount: number;
  icon: string;
  accent: StudentExamRow['accent'];
};

const ACCENTS: StudentExamRow['accent'][] = [
  'teal',
  'blue',
  'green',
  'orange',
  'purple',
  'pink',
  'red',
];

const GUIDELINES = [
  'Bring your valid school ID card',
  'Arrive at least 30 minutes early',
  'Electronic devices are not allowed',
  'Follow seating and room instructions',
];

function subjectIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('math')) return 'calculator-outline';
  if (n.includes('science') || n.includes('physics') || n.includes('chem') || n.includes('bio'))
    return 'flask-outline';
  if (n.includes('english') || n.includes('lang')) return 'book-outline';
  if (n.includes('histor') || n.includes('social')) return 'globe-outline';
  if (n.includes('computer') || n.includes('it')) return 'laptop-outline';
  if (n.includes('hindi') || n.includes('telugu')) return 'language-outline';
  return 'school-outline';
}

function gradeFromPct(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'E';
}

function ymd(raw: string): string {
  return String(raw || '').slice(0, 10);
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = ymd(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function mapScheduleRows(raw: unknown): StudentExamRow[] {
  const items = safeList<Record<string, unknown>>(
    (raw as { items?: unknown })?.items ?? raw,
  );
  const today = toLocalDateStr();
  return items
    .map((ex, i) => {
      const examDate = ymd(pickString(ex.exam_date, ex.date, ex.scheduled_date));
      if (!examDate) return null;
      const state: StudentExamRow['state'] =
        examDate < today ? 'completed' : examDate === today ? 'ongoing' : 'upcoming';
      const subjectName = pickString(ex.subject_name, ex.subject, 'Subject');
      const durationMins = pickNumber(ex.duration_mins, ex.duration_minutes);
      const startTime = pickString(ex.start_time, ex.time);
      return {
        id: pickString(ex.exam_subject_id, ex.id, `exam-${i}`),
        examItemId: pickNumber(ex.exam_item_id, ex.id),
        examName: pickString(ex.exam_name, ex.title, 'Exam'),
        examGroupName: pickString(ex.exam_group_name, ex.group_name),
        session: pickString(ex.session),
        subjectName,
        className: pickString(ex.class_name, ex.className),
        examDate,
        startTime,
        durationMins,
        roomNo: pickString(ex.room_no, ex.room, ex.venue, ex.hall) || '—',
        maxMarks: pickNumber(ex.max_marks, ex.maxMarks),
        state,
        icon: subjectIcon(subjectName),
        accent: ACCENTS[i % ACCENTS.length],
      } satisfies StudentExamRow;
    })
    .filter(Boolean) as StudentExamRow[];
}

function mapPerformance(raw: unknown): {
  rows: StudentExamPerfRow[];
  overallPct: number;
} {
  const root = (raw ?? {}) as Record<string, unknown>;
  const items = safeList<Record<string, unknown>>(
    root.items ?? root.subjects ?? root.performance ?? raw,
  );
  const rows = items.map((r, i) => {
    const subject = pickString(r.subject_name, r.subject, r.name, `Subject ${i + 1}`);
    const percent = pickNumber(r.percentage, r.percent, r.avg_percent);
    const maxMarks = pickNumber(r.max_marks, r.total_marks, 100) || 100;
    const obtained =
      pickNumber(r.obtained, r.marks_obtained) ||
      Math.round((percent / 100) * maxMarks);
    return {
      id: pickString(r.subject_id, r.id, `perf-${i}`),
      subject,
      percent,
      obtained,
      maxMarks,
      grade: pickString(r.grade, r.letter_grade) || gradeFromPct(percent),
      examCount: pickNumber(r.exam_count, r.count),
      icon: subjectIcon(subject),
      accent: ACCENTS[i % ACCENTS.length],
    } satisfies StudentExamPerfRow;
  });
  const overallPct =
    pickNumber(root.overall_percentage, root.average, root.avg) ||
    (rows.length
      ? Math.round((rows.reduce((s, r) => s + r.percent, 0) / rows.length) * 10) / 10
      : 0);
  return { rows, overallPct };
}

function mockScheduleRows(): StudentExamRow[] {
  const today = toLocalDateStr();
  return examSchedule.map((ex, i) => {
    // Mock fixtures use display labels — synthesize ISO for filtering
    const offset = i * 2;
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const examDate = toLocalDateStr(d);
    const state: StudentExamRow['state'] =
      examDate < today ? 'completed' : examDate === today ? 'ongoing' : 'upcoming';
    return {
      id: ex.id,
      examItemId: i + 1,
      examName: 'Periodic Test - I',
      examGroupName: 'Term 1',
      session: '',
      subjectName: ex.subject,
      className: '',
      examDate,
      startTime: '09:00',
      durationMins: 120,
      roomNo: ex.room || '—',
      maxMarks: 100,
      state,
      icon: ex.icon,
      accent: ex.accent,
    };
  });
}

export function useStudentExams() {
  const session = useSchoolsSession();
  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StudentExamRow[]>([]);
  const [perfRows, setPerfRows] = useState<StudentExamPerfRow[]>([]);
  const [overallPct, setOverallPct] = useState(0);
  const [groupFilter, setGroupFilter] = useState('all');
  const [examFilter, setExamFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setRows(mockScheduleRows());
      setPerfRows(
        examResults.map((r) => ({
          id: r.id,
          subject: r.subject,
          percent: r.percent,
          obtained: r.obtained,
          maxMarks: r.maxMarks,
          grade: r.grade,
          examCount: 1,
          icon: r.icon,
          accent: r.accent,
        })),
      );
      setOverallPct(examResultsSummary.overallPercent);
      setStatus('ready');
      setError(null);
      return;
    }
    if (!session.schoolId) {
      setRows([]);
      setPerfRows([]);
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const [schedRaw, perfRaw] = await Promise.all([
        examAllItemsApi.mySchedule({ school_id: session.schoolId }),
        examAllItemsApi.mySubjectPerformance({ school_id: session.schoolId }).catch(() => null),
      ]);
      setRows(mapScheduleRows(schedRaw));
      const perf = mapPerformance(perfRaw);
      setPerfRows(perf.rows);
      setOverallPct(perf.overallPct);
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load exam schedule'));
      setRows([]);
      setStatus('error');
    }
  }, [session.schoolId]);

  useEffect(() => {
    void load();
  }, [load]);

  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.examGroupName) set.add(r.examGroupName);
    });
    return ['all', ...[...set].sort()];
  }, [rows]);

  const examOptions = useMemo(() => {
    const map = new Map<number, string>();
    rows.forEach((r) => {
      if (r.examItemId) map.set(r.examItemId, r.examName || `Exam ${r.examItemId}`);
    });
    return [{ id: 'all', label: 'All Exams' }, ...[...map.entries()].map(([id, label]) => ({
      id: String(id),
      label,
    }))];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => (groupFilter === 'all' ? true : r.examGroupName === groupFilter))
      .filter((r) =>
        examFilter === 'all' ? true : String(r.examItemId) === examFilter,
      )
      .sort((a, b) => a.examDate.localeCompare(b.examDate) || a.startTime.localeCompare(b.startTime));
  }, [rows, groupFilter, examFilter]);

  const upcoming = useMemo(
    () => filtered.filter((r) => r.state === 'upcoming' || r.state === 'ongoing'),
    [filtered],
  );
  const completed = useMemo(
    () => filtered.filter((r) => r.state === 'completed'),
    [filtered],
  );

  const nextExam = upcoming[0] ?? null;

  const overview = useMemo(() => {
    const subjects = new Set(filtered.map((r) => r.subjectName));
    const hours = filtered.reduce((s, r) => s + (r.durationMins || 0), 0) / 60;
    return {
      total: filtered.length,
      upcoming: upcoming.length,
      subjects: subjects.size,
      hours: Math.round(hours * 10) / 10,
    };
  }, [filtered, upcoming.length]);

  const countdownLabel = useMemo(() => {
    if (!nextExam) return null;
    const today = parseLocalDate(toLocalDateStr());
    const exam = parseLocalDate(nextExam.examDate);
    const days = Math.round((exam.getTime() - today.getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days > 1) return `In ${days} days`;
    return null;
  }, [nextExam]);

  const monthLabel = useMemo(
    () =>
      new Date(calYear, calMonth, 1).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      }),
    [calMonth, calYear],
  );

  const monthCells = useMemo(() => {
    const firstDow = new Date(calYear, calMonth, 1).getDay();
    const dim = new Date(calYear, calMonth + 1, 0).getDate();
    const today = toLocalDateStr();
    const byDate = new Map<string, StudentExamRow[]>();
    filtered.forEach((r) => {
      const list = byDate.get(r.examDate) || [];
      list.push(r);
      byDate.set(r.examDate, list);
    });
    const cells: {
      day: number | null;
      date: string;
      exams: StudentExamRow[];
      isToday: boolean;
    }[] = [];
    for (let i = 0; i < firstDow; i += 1) {
      cells.push({ day: null, date: '', exams: [], isToday: false });
    }
    for (let d = 1; d <= dim; d += 1) {
      const date = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        day: d,
        date,
        exams: byDate.get(date) || [],
        isToday: date === today,
      });
    }
    return cells;
  }, [calYear, calMonth, filtered]);

  const shiftMonth = useCallback((delta: number) => {
    setCalMonth((m) => {
      const d = new Date(calYear, m + delta, 1);
      setCalYear(d.getFullYear());
      return d.getMonth();
    });
  }, [calYear]);

  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const resetFilters = useCallback(() => {
    setGroupFilter('all');
    setExamFilter('all');
  }, []);

  return useMemo(
    () => ({
      status,
      error,
      refetch: load,
      rows: filtered,
      allRows: rows,
      upcoming,
      completed,
      nextExam,
      countdownLabel,
      overview,
      guidelines: GUIDELINES,
      groupFilter,
      setGroupFilter,
      groupOptions,
      examFilter,
      setExamFilter,
      examOptions,
      resetFilters,
      viewMode,
      setViewMode,
      calMonth,
      calYear,
      monthLabel,
      monthCells,
      shiftMonth,
      selected,
      setSelectedId,
      perfRows,
      overallPct,
      formatTime: (start?: string, mins?: number) => formatExamTime(start, mins),
      formatDate: formatExamDateLabel,
      timeAmPm: (start?: string) => {
        if (!start) return '—';
        const raw = start.slice(0, 5);
        const [h, m] = raw.split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return start;
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
      },
    }),
    [
      status,
      error,
      load,
      filtered,
      rows,
      upcoming,
      completed,
      nextExam,
      countdownLabel,
      overview,
      groupFilter,
      groupOptions,
      examFilter,
      examOptions,
      resetFilters,
      viewMode,
      calMonth,
      calYear,
      monthLabel,
      monthCells,
      shiftMonth,
      selected,
      perfRows,
      overallPct,
    ],
  );
}
