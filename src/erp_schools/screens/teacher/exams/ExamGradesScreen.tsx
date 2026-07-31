/**
 * Exam Grades — web ExamGroupsSubView GradesPanel parity.
 * Apply a template (CBSE / Percentage / GPA) or edit grade bands inline.
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
  TextField,
  PrimaryButton,
  EmptyState,
  ScreenLoader,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherExamsData } from '../../../hooks/useTeacherExamsData';
import { GRADE_TEMPLATES } from '../../../utils/examMeta';
import type { TeacherStackParamList } from '../../../types/navigation';
import { extractErrorMessage, pickString, safeList } from '../../../utils/apiHelpers';

type GradeEdit = {
  key: string;
  grade: string;
  percentFrom: string;
  percentTo: string;
  gradePoint: string;
  description: string;
};

let rowKeySeq = 0;
function newRowKey(): string {
  rowKeySeq += 1;
  return `row-${Date.now()}-${rowKeySeq}`;
}

function mapGradeRow(r: Record<string, unknown>): GradeEdit {
  return {
    key: newRowKey(),
    grade: pickString(r.grade),
    percentFrom: r.percent_from != null ? String(r.percent_from) : '0',
    percentTo: r.percent_to != null ? String(r.percent_to) : '100',
    gradePoint: r.grade_point != null ? String(r.grade_point) : '',
    description: pickString(r.description),
  };
}

export default function ExamGradesScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'ExamGrades'>>();
  const navigation = useTeacherNavigation();
  const { groupId } = route.params;
  const exams = useTeacherExamsData('groups');

  const [rows, setRows] = useState<GradeEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await exams.apis.grades.list(groupId);
      const obj = data as Record<string, unknown>;
      const items = safeList<Record<string, unknown>>(
        Array.isArray(data) ? data : obj.items,
      );
      setRows(items.map(mapGradeRow));
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupId]),
  );

  const updateRow = (key: string, patch: Partial<GradeEdit>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { key: newRowKey(), grade: '', percentFrom: '0', percentTo: '100', gradePoint: '', description: '' },
    ]);
  };

  const onApplyTemplate = (templateKey: string, label: string) => {
    Alert.alert(
      `Apply ${label} template?`,
      'This replaces the current grade bands with the template defaults.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => {
            void (async () => {
              setApplyingTemplate(templateKey);
              try {
                const res = (await exams.apis.grades.applyTemplate(groupId, templateKey)) as Record<
                  string,
                  unknown
                >;
                const items = safeList<Record<string, unknown>>(
                  Array.isArray(res) ? res : res.items,
                );
                setRows(items.map(mapGradeRow));
              } catch (e) {
                Alert.alert('Failed', extractErrorMessage(e));
              } finally {
                setApplyingTemplate(null);
              }
            })();
          },
        },
      ],
    );
  };

  const onSave = async () => {
    for (const r of rows) {
      if (!r.grade.trim()) {
        Alert.alert('Invalid', 'All grades require a name.');
        return;
      }
      const from = Number(r.percentFrom);
      const to = Number(r.percentTo);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
        Alert.alert('Invalid', `${r.grade}: % From must be less than % To.`);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = rows.map((r, index) => ({
        grade: r.grade.trim(),
        percent_from: Number(r.percentFrom),
        percent_to: Number(r.percentTo),
        grade_point: r.gradePoint.trim() !== '' ? Number(r.gradePoint) : undefined,
        description: r.description.trim() || undefined,
        sort_order: index,
      }));
      const res = (await exams.apis.grades.bulkSave(groupId, payload)) as Record<string, unknown>;
      const items = safeList<Record<string, unknown>>(Array.isArray(res) ? res : res.items);
      setRows(items.length > 0 ? items.map(mapGradeRow) : rows);
      Alert.alert('Saved', 'Grade bands updated.');
    } catch (e) {
      Alert.alert('Save failed', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading && rows.length === 0) {
    return (
      <TeacherScreen header={<ScreenHeader title="Exam Grades" />}>
        <ScreenLoader message="Loading grades…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title="Exam Grades" />}
      contentStyle={styles.content}
      footer={
        <View style={styles.footerRow}>
          <PrimaryButton
            label="Cancel"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label={saving ? 'Saving…' : 'Save Grades'}
            icon="checkmark-outline"
            disabled={saving}
            onPress={() => void onSave()}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      {error ? <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text> : null}

      <SurfaceCard>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Apply Template
        </Text>
        <View style={styles.templateRow}>
          {GRADE_TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.templateChip, { borderColor: theme.colors.primary }]}
              disabled={applyingTemplate != null}
              onPress={() => onApplyTemplate(t.key, t.label)}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>
                {applyingTemplate === t.key ? 'Applying…' : t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SurfaceCard>

      {rows.length === 0 ? (
        <EmptyState
          icon="ribbon-outline"
          title="No grade bands"
          message="Apply a template or add a grade row to get started."
        />
      ) : (
        rows.map((row) => (
          <SurfaceCard key={row.key} style={styles.rowCard}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={row.grade}
                  onChangeText={(v) => updateRow(row.key, { grade: v })}
                  placeholder="Grade e.g. A+"
                />
              </View>
              <TouchableOpacity onPress={() => removeRow(row.key)} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={22} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  % From
                </Text>
                <TextField
                  value={row.percentFrom}
                  onChangeText={(v) => updateRow(row.key, { percentFrom: v })}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  % To
                </Text>
                <TextField
                  value={row.percentTo}
                  onChangeText={(v) => updateRow(row.key, { percentTo: v })}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  Points
                </Text>
                <TextField
                  value={row.gradePoint}
                  onChangeText={(v) => updateRow(row.key, { gradePoint: v })}
                  keyboardType="decimal-pad"
                  placeholder="—"
                />
              </View>
            </View>
            <TextField
              value={row.description}
              onChangeText={(v) => updateRow(row.key, { description: v })}
              placeholder="Description (optional)"
            />
          </SurfaceCard>
        ))
      )}

      <TouchableOpacity
        style={[styles.addRowBtn, { borderColor: theme.colors.primary }]}
        onPress={addRow}
      >
        <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>
          Add Grade Row
        </Text>
      </TouchableOpacity>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  templateChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rowCard: { gap: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowFields: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    borderStyle: 'dashed',
    paddingVertical: 12,
  },
  footerRow: { flexDirection: 'row', gap: 10 },
});
