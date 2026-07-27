/**
 * Exam Report Cards — mobile-friendly student report view (no PDF).
 * Web parity: ExamsTab "Report Cards" tab → pick exam → pick student → view breakdown.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SearchBar,
  ListItem,
  Badge,
  EmptyState,
  ScreenLoader,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherExamsData } from '../../../hooks/useTeacherExamsData';
import { statusTone } from '../../../utils/examMeta';
import type { TeacherStackParamList } from '../../../types/navigation';
import { extractErrorMessage, pickNumber, pickString, safeList } from '../../../utils/apiHelpers';

type SubjectDetail = {
  examSubjectId: number;
  subjectName: string;
  marksObtained: number | null;
  maxMarks: number;
  minMarks: number;
  attendanceStatus: string;
};

type ReportRow = {
  studentId: number;
  studentName: string;
  admissionNumber: string;
  rollNumber: string;
  totalMarks: number;
  maxTotalMarks: number;
  percentage: number;
  grade: string;
  resultStatus: string;
  rank: number | null;
  subjectDetails: SubjectDetail[];
};

export default function ExamReportCardsScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'ExamReportCards'>>();
  const { itemId, examName } = route.params;
  const exams = useTeacherExamsData('documents');

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReportRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await exams.apis.results.view(itemId)) as Record<string, unknown>;
      setGenerated(data.generated === true);
      const items = safeList<Record<string, unknown>>(data.items).map(
        (r): ReportRow => ({
          studentId: pickNumber(r.student_id),
          studentName: pickString(r.student_name, `Student #${pickNumber(r.student_id)}`),
          admissionNumber: pickString(r.admission_number),
          rollNumber: pickString(r.roll_number),
          totalMarks: pickNumber(r.total_marks),
          maxTotalMarks: pickNumber(r.max_total_marks),
          percentage: pickNumber(r.percentage),
          grade: pickString(r.grade),
          resultStatus: pickString(r.result_status, 'pending'),
          rank: r.rank != null ? Number(r.rank) : null,
          subjectDetails: safeList<Record<string, unknown>>(r.subject_details).map((sd) => ({
            examSubjectId: pickNumber(sd.exam_subject_id),
            subjectName: pickString(sd.subject_name, `Subject #${pickNumber(sd.exam_subject_id)}`),
            marksObtained: sd.marks_obtained != null ? Number(sd.marks_obtained) : null,
            maxMarks: pickNumber(sd.max_marks),
            minMarks: pickNumber(sd.min_marks),
            attendanceStatus: pickString(sd.attendance_status, 'present'),
          })),
        }),
      );
      setRows(items);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) || r.admissionNumber.toLowerCase().includes(q),
    );
  }, [rows, search]);

  if (loading && rows.length === 0) {
    return (
      <TeacherScreen header={<ScreenHeader title="Report Cards" />}>
        <ScreenLoader message="Loading report cards…" />
      </TeacherScreen>
    );
  }

  if (selected) {
    return (
      <TeacherScreen
        header={
          <ScreenHeader
            title={selected.studentName}
            onBack={() => setSelected(null)}
          />
        }
        contentStyle={styles.content}
      >
        <SurfaceCard style={styles.summaryCard}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            {examName || 'Exam'} · {selected.admissionNumber}
            {selected.rollNumber ? ` · Roll ${selected.rollNumber}` : ''}
          </Text>
          <View style={styles.summaryRow}>
            <SummaryTile
              label="Total"
              value={`${selected.totalMarks}/${selected.maxTotalMarks}`}
              accent="blue"
            />
            <SummaryTile label="%" value={`${selected.percentage.toFixed(1)}%`} accent="purple" />
            <SummaryTile label="Grade" value={selected.grade || '—'} accent="orange" />
            {selected.rank != null ? (
              <SummaryTile label="Rank" value={`#${selected.rank}`} accent="teal" />
            ) : null}
          </View>
          <Badge
            label={selected.resultStatus}
            accent={statusTone(selected.resultStatus)}
          />
        </SurfaceCard>

        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Subject Breakdown
        </Text>

        {selected.subjectDetails.length === 0 ? (
          <EmptyState icon="book-outline" title="No subjects" message="No subject marks recorded." />
        ) : (
          <SurfaceCard padded={false} style={styles.listCard}>
            {selected.subjectDetails.map((sd, index) => {
              const isAbsent = sd.attendanceStatus === 'absent';
              const failed = !isAbsent && sd.marksObtained != null && sd.marksObtained < sd.minMarks;
              return (
                <View
                  key={sd.examSubjectId}
                  style={[
                    styles.subjectRow,
                    index < selected.subjectDetails.length - 1 && {
                      borderBottomColor: theme.colors.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.textPrimary, fontWeight: '600', fontSize: 14 }}>
                      {sd.subjectName}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                      Pass {sd.minMarks} / Max {sd.maxMarks}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: isAbsent
                        ? theme.colors.textSecondary
                        : failed
                          ? theme.colors.danger
                          : theme.colors.success,
                    }}
                  >
                    {isAbsent ? 'Absent' : `${sd.marksObtained ?? '—'}/${sd.maxMarks}`}
                  </Text>
                </View>
              );
            })}
          </SurfaceCard>
        )}
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen header={<ScreenHeader title="Report Cards" />} contentStyle={styles.content}>
      {error ? <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text> : null}
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
        {examName ? `${examName} · ` : ''}Tap a student to view their report card.
      </Text>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search students…" />

      {!generated ? (
        <EmptyState
          icon="document-text-outline"
          title="Results not generated"
          message="Generate results from Exam Results before viewing report cards."
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="people-outline" title="No students" message="No results found." />
      ) : (
        <SurfaceCard padded={false} style={styles.listCard}>
          {filtered.map((row, index) => (
            <ListItem
              key={row.studentId}
              avatarName={row.studentName}
              title={row.studentName}
              subtitle={`${row.admissionNumber} · ${row.percentage.toFixed(1)}%${row.grade ? ` · ${row.grade}` : ''}`}
              divider={index < filtered.length - 1}
              showChevron
              onPress={() => setSelected(row)}
              trailing={<Badge label={row.resultStatus} accent={statusTone(row.resultStatus)} />}
            />
          ))}
        </SurfaceCard>
      )}
    </TeacherScreen>
  );
}

function SummaryTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'blue' | 'purple' | 'orange' | 'teal';
}) {
  const theme = useTeacherTheme();
  const bg =
    accent === 'blue'
      ? theme.colors.tintBlue
      : accent === 'purple'
        ? theme.colors.tintPurple
        : accent === 'orange'
          ? theme.colors.tintOrange
          : theme.colors.tintTeal;
  const fg =
    accent === 'blue'
      ? theme.colors.onTintBlue
      : accent === 'purple'
        ? theme.colors.onTintPurple
        : accent === 'orange'
          ? theme.colors.onTintOrange
          : theme.colors.onTintTeal;
  return (
    <View style={[styles.summaryTile, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontWeight: '800', fontSize: 16 }}>{value}</Text>
      <Text style={{ color: fg, fontSize: 10, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  listCard: { paddingHorizontal: 14 },
  summaryCard: { gap: 10 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryTile: {
    flexGrow: 1,
    minWidth: '22%',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 10,
  },
});
