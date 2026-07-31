/**
 * Exam Results — web ExamGroupsSubView results panel parity.
 * View KPIs, generate results, publish, and expand each student's subject breakdown.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  StatGrid,
  Badge,
  EmptyState,
  ScreenLoader,
  PrimaryButton,
  type StatItem,
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

type ResultRow = {
  studentId: number;
  studentName: string;
  admissionNumber: string;
  totalMarks: number;
  maxTotalMarks: number;
  percentage: number;
  grade: string;
  resultStatus: string;
  subjectDetails: SubjectDetail[];
};

type ResultsView = {
  items: ResultRow[];
  total: number;
  generated: boolean;
  published: boolean;
  passCount: number;
  failCount: number;
  absentCount: number;
  classAvg: number | null;
  highestMarks: number | null;
  topperName: string;
};

function mapResultsView(data: Record<string, unknown>): ResultsView {
  const items = safeList<Record<string, unknown>>(data.items).map((r) => ({
    studentId: pickNumber(r.student_id),
    studentName: pickString(r.student_name, `Student #${pickNumber(r.student_id)}`),
    admissionNumber: pickString(r.admission_number),
    totalMarks: pickNumber(r.total_marks),
    maxTotalMarks: pickNumber(r.max_total_marks),
    percentage: pickNumber(r.percentage),
    grade: pickString(r.grade),
    resultStatus: pickString(r.result_status, 'pending'),
    subjectDetails: safeList<Record<string, unknown>>(r.subject_details).map((sd) => ({
      examSubjectId: pickNumber(sd.exam_subject_id),
      subjectName: pickString(sd.subject_name, `Subject #${pickNumber(sd.exam_subject_id)}`),
      marksObtained: sd.marks_obtained != null ? Number(sd.marks_obtained) : null,
      maxMarks: pickNumber(sd.max_marks),
      minMarks: pickNumber(sd.min_marks),
      attendanceStatus: pickString(sd.attendance_status, 'present'),
    })),
  }));
  return {
    items,
    total: pickNumber(data.total, items.length),
    generated: data.generated === true,
    published: data.published === true,
    passCount: pickNumber(data.pass_count),
    failCount: pickNumber(data.fail_count),
    absentCount: pickNumber(data.absent_count),
    classAvg: data.class_avg != null ? Number(data.class_avg) : null,
    highestMarks: data.highest_marks != null ? Number(data.highest_marks) : null,
    topperName: pickString(data.topper_name),
  };
}

export default function ExamResultsManageScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'ExamResultsManage'>>();
  const { itemId } = route.params;
  const exams = useTeacherExamsData('results');

  const [view, setView] = useState<ResultsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'generate' | 'publish' | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await exams.apis.results.view(itemId)) as Record<string, unknown>;
      setView(mapResultsView(data));
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

  const onGenerate = () => {
    Alert.alert(
      'Generate results?',
      'This computes totals, grades and rank from currently saved marks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: () => {
            void (async () => {
              setBusy('generate');
              try {
                const data = (await exams.apis.results.generate(itemId)) as Record<string, unknown>;
                setView(mapResultsView(data));
              } catch (e) {
                Alert.alert('Generate failed', extractErrorMessage(e));
              } finally {
                setBusy(null);
              }
            })();
          },
        },
      ],
    );
  };

  const onPublish = () => {
    Alert.alert('Publish results?', 'Students and parents will be able to view results.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        onPress: () => {
          void (async () => {
            setBusy('publish');
            try {
              const data = (await exams.apis.results.publish(itemId)) as Record<string, unknown>;
              setView(mapResultsView(data));
            } catch (e) {
              Alert.alert('Publish failed', extractErrorMessage(e));
            } finally {
              setBusy(null);
            }
          })();
        },
      },
    ]);
  };

  if (loading && !view) {
    return (
      <TeacherScreen header={<ScreenHeader title="Exam Results" />}>
        <ScreenLoader message="Loading results…" />
      </TeacherScreen>
    );
  }

  const kpis: StatItem[] = [
    { key: 'pass', icon: 'checkmark-circle-outline', value: view?.passCount ?? 0, label: 'Pass', accent: 'green' },
    { key: 'fail', icon: 'close-circle-outline', value: view?.failCount ?? 0, label: 'Fail', accent: 'red' },
    { key: 'absent', icon: 'remove-circle-outline', value: view?.absentCount ?? 0, label: 'Absent', accent: 'orange' },
    {
      key: 'avg',
      icon: 'trending-up-outline',
      value: view?.classAvg != null ? `${Math.round(view.classAvg)}%` : '—',
      label: 'Class Avg',
      accent: 'blue',
    },
  ];

  return (
    <TeacherScreen
      header={<ScreenHeader title="Exam Results" />}
      contentStyle={styles.content}
      refreshing={loading}
      onRefresh={() => void load()}
      footer={
        <View style={styles.footerRow}>
          <PrimaryButton
            label={busy === 'generate' ? 'Generating…' : 'Generate'}
            icon="refresh-outline"
            variant="outline"
            disabled={busy != null}
            onPress={onGenerate}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label={busy === 'publish' ? 'Publishing…' : view?.published ? 'Published' : 'Publish'}
            icon="megaphone-outline"
            variant="gradient"
            disabled={busy != null || !view?.generated || view?.published}
            onPress={onPublish}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      {error ? <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text> : null}

      <View style={styles.statusRow}>
        <Badge
          label={view?.generated ? 'Generated' : 'Not generated'}
          accent={view?.generated ? 'green' : 'orange'}
        />
        <Badge
          label={view?.published ? 'Published' : 'Not published'}
          accent={view?.published ? 'green' : 'orange'}
        />
        {view?.topperName ? <Badge label={`Topper: ${view.topperName}`} accent="purple" /> : null}
      </View>

      <SurfaceCard>
        <StatGrid items={kpis} columns={4} variant="tinted" />
      </SurfaceCard>

      {!view?.generated ? (
        <EmptyState
          icon="trophy-outline"
          title="Results not generated"
          message="Tap Generate once marks entry is complete for every subject."
        />
      ) : view.items.length === 0 ? (
        <EmptyState icon="people-outline" title="No results" message="No students found for this exam." />
      ) : (
        view.items.map((row) => {
          const expanded = expandedId === row.studentId;
          return (
            <SurfaceCard key={row.studentId} style={styles.rowCard}>
              <TouchableOpacity
                style={styles.rowTop}
                onPress={() => setExpandedId(expanded ? null : row.studentId)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>
                    {row.studentName}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                    {row.admissionNumber} · {row.totalMarks}/{row.maxTotalMarks} ·{' '}
                    {row.percentage.toFixed(1)}%{row.grade ? ` · ${row.grade}` : ''}
                  </Text>
                </View>
                <Badge label={row.resultStatus} accent={statusTone(row.resultStatus)} />
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              {expanded && row.subjectDetails.length > 0 ? (
                <View style={[styles.subjectList, { borderTopColor: theme.colors.border }]}>
                  {row.subjectDetails.map((sd) => {
                    const isAbsent = sd.attendanceStatus === 'absent';
                    const failed = !isAbsent && sd.marksObtained != null && sd.marksObtained < sd.minMarks;
                    return (
                      <View key={sd.examSubjectId} style={styles.subjectRow}>
                        <Text style={{ color: theme.colors.textPrimary, fontSize: 13, flex: 1 }}>
                          {sd.subjectName}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: isAbsent
                              ? theme.colors.textSecondary
                              : failed
                                ? theme.colors.danger
                                : theme.colors.success,
                          }}
                        >
                          {isAbsent ? 'AB' : `${sd.marksObtained ?? '—'}/${sd.maxMarks}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </SurfaceCard>
          );
        })
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowCard: { gap: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  subjectList: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerRow: { flexDirection: 'row', gap: 10 },
});
