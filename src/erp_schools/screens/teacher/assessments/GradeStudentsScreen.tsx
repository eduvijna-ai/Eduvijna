/** Grade Students — enter marks per student for the selected class. */

import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SelectField,
  Avatar,
  PrimaryButton,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherData } from '../../../hooks/useTeacherData';
import type { TeacherStackParamList } from '../../../types/navigation';

const MAX_MARKS = 50;

export default function GradeStudentsScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'GradeStudents'>>();
  const { classes, getClassById, getRoster } = useTeacherData();
  const initialClass = getClassById(route.params?.classId);
  const [classId, setClassId] = useState<string | null>(initialClass?.id ?? classes[0]?.id ?? null);
  const [marks, setMarks] = useState<Record<string, string>>({});

  const activeClass = useMemo(() => classes.find((c) => c.id === classId) ?? classes[0], [classes, classId]);
  const roster = getRoster(activeClass?.code ?? '8-A');
  const classOptions = classes.map((c) => ({ label: c.name, value: c.id }));

  const onSave = () => Alert.alert('Marks saved', `Grades recorded for ${activeClass?.name} (demo).`);

  return (
    <TeacherScreen
      header={<ScreenHeader title="Grade Students" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Save Marks" icon="save-outline" onPress={onSave} />}
    >
      <SurfaceCard>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Select Class</Text>
        <SelectField options={classOptions} value={classId} onChange={setClassId} />
        <Text style={[styles.maxNote, { color: theme.colors.textSecondary }]}>Enter marks out of {MAX_MARKS}</Text>
      </SurfaceCard>

      <SurfaceCard padded={false} style={styles.card}>
        {roster.map((student, index) => (
          <View key={student.id} style={[styles.row, index < roster.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <Avatar name={student.name} size={36} />
            <View style={styles.info}>
              <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{student.name}</Text>
              <Text style={[styles.roll, { color: theme.colors.textSecondary }]}>{student.rollNo}</Text>
            </View>
            <View style={[styles.markInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}>
              <TextInput
                style={[styles.markText, { color: theme.colors.textPrimary }]}
                value={marks[student.id] ?? ''}
                onChangeText={(text) => setMarks((prev) => ({ ...prev, [student.id]: text.replace(/[^0-9]/g, '').slice(0, 3) }))}
                placeholder="--"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="number-pad"
                accessibilityLabel={`Marks for ${student.name}`}
              />
              <Text style={[styles.markMax, { color: theme.colors.textSecondary }]}>/{MAX_MARKS}</Text>
            </View>
          </View>
        ))}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  maxNote: { fontSize: 12, marginTop: 8 },
  card: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' },
  roll: { fontSize: 11, marginTop: 1 },
  markInput: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 10, height: 40, gap: 2 },
  markText: { width: 36, fontSize: 15, fontWeight: '700', textAlign: 'center', padding: 0 },
  markMax: { fontSize: 12 },
});
