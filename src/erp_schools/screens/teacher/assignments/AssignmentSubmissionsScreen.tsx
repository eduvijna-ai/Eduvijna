/** Assignment Submissions — per-student submission status + marks. */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SegmentedControl,
  ListItem,
  StatusPill,
  type Segment,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { submissionsFor } from '../../../data';
import type { TeacherStackParamList } from '../../../types/navigation';

const SEGMENTS: Segment[] = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'pending', label: 'Pending' },
  { key: 'graded', label: 'Graded' },
];

export default function AssignmentSubmissionsScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'AssignmentSubmissions'>>();
  const submissions = useMemo(() => submissionsFor(route.params?.assignmentId ?? 'as1'), [route.params?.assignmentId]);
  const [tab, setTab] = useState('all');

  const filtered = useMemo(
    () => submissions.filter((s) => tab === 'all' || s.status === tab || (tab === 'submitted' && s.status === 'late')),
    [submissions, tab],
  );

  return (
    <TeacherScreen header={<ScreenHeader title="Submissions" trailingIcon="download-outline" />} contentStyle={styles.content}>
      <SegmentedControl segments={SEGMENTS} activeKey={tab} onChange={setTab} />

      <SurfaceCard padded={false} style={styles.card}>
        {filtered.map((submission, index) => (
          <ListItem
            key={submission.id}
            avatarName={submission.student.name}
            title={submission.student.name}
            subtitle={`${submission.student.rollNo}${submission.submittedAt ? ` • ${submission.submittedAt}` : ''}`}
            divider={index < filtered.length - 1}
            trailing={
              <View style={styles.right}>
                {submission.status === 'graded' && submission.marks != null ? (
                  <Text style={[styles.marks, { color: theme.colors.textPrimary }]}>{submission.marks}/{submission.maxMarks}</Text>
                ) : null}
                <StatusPill status={submission.status === 'late' ? 'pending' : submission.status} label={submission.status === 'late' ? 'Late' : undefined} showIcon={false} />
              </View>
            }
          />
        ))}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  card: { paddingHorizontal: 14 },
  right: { alignItems: 'flex-end', gap: 4 },
  marks: { fontSize: 14, fontWeight: '700' },
});
