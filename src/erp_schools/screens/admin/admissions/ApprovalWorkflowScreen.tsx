/** Approval Workflow — pending requests awaiting admin action (approve/reject). */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  PrimaryButton,
  EmptyState,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminData } from '../../../hooks/useAdminData';
import { accentColors } from '../../../theme/accents';

export default function ApprovalWorkflowScreen() {
  const theme = useTeacherTheme();
  const { admissions } = useAdminData();

  return (
    <TeacherScreen header={<ScreenHeader title="Approval Workflow" />} contentStyle={styles.content}>
      <SectionHeader title={`Pending Approvals (${admissions.workflow.length})`} />

      {admissions.workflow.length === 0 ? (
        <SurfaceCard>
          <EmptyState icon="checkmark-done-outline" title="All caught up" message="No pending approvals right now." />
        </SurfaceCard>
      ) : (
        admissions.workflow.map((item) => {
          const accent = accentColors(theme.colors, item.accent);
          return (
            <SurfaceCard key={item.id} style={styles.card}>
              <View style={styles.headerRow}>
                <View style={[styles.icon, { backgroundColor: accent.bg }]}>
                  <Ionicons name={item.icon} size={20} color={accent.fg} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{item.subtitle}</Text>
                  <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                    {item.requestedBy} • {item.dateLabel}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <PrimaryButton label="Approve" icon="checkmark" onPress={() => undefined} style={styles.actionBtn} />
                <PrimaryButton label="Reject" icon="close" variant="outline" onPress={() => undefined} style={styles.actionBtn} />
              </View>
            </SurfaceCard>
          );
        })
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  card: { gap: 12 },
  headerRow: { flexDirection: 'row', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 13 },
  meta: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1 },
});
