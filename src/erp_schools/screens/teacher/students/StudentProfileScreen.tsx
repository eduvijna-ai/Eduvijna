/** Student Profile — identity, performance stats, guardian + quick actions. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  HeroCard,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  Avatar,
  PrimaryButton,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';
import type { TeacherStackParamList } from '../../../types/navigation';

export default function StudentProfileScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'StudentProfile'>>();
  const navigation = useTeacherNavigation();
  const { getStudentById } = useTeacherData();
  const student = getStudentById(route.params?.studentId);

  if (!student) {
    return (
      <TeacherScreen header={<ScreenHeader title="Student Profile" />}>
        <View />
      </TeacherScreen>
    );
  }

  const stats: StatItem[] = [
    { key: 'attendance', icon: 'checkbox-outline', value: `${student.attendancePercent ?? 0}%`, label: 'Attendance', accent: 'green' },
    { key: 'score', icon: 'ribbon-outline', value: `${student.averageScore ?? 0}%`, label: 'Avg Score', accent: 'orange' },
    { key: 'rank', icon: 'trophy-outline', value: '#7', label: 'Class Rank', accent: 'purple' },
  ];

  return (
    <TeacherScreen
      header={<ScreenHeader title="Student Profile" trailingIcon="ellipsis-horizontal" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Message Parent" icon="chatbubble-outline" onPress={() => navigation.navigate('ParentCommunication', {})} />}
    >
      <HeroCard>
        <View style={styles.heroRow}>
          <Avatar name={student.name} uri={student.avatarUrl} size={64} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{student.name}</Text>
            <Text style={styles.heroMeta}>{student.rollNo} • Class {student.classCode}</Text>
          </View>
        </View>
      </HeroCard>

      <SurfaceCard>
        <StatGrid items={stats} columns={3} />
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Guardian" />
        <SurfaceCard>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: theme.colors.tintBlue }]}>
              <Ionicons name="person-outline" size={18} color={theme.colors.onTintBlue} />
            </View>
            <View style={styles.text}>
              <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{student.guardianName}</Text>
              <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>{student.guardianRelation}</Text>
            </View>
            <Ionicons name="call-outline" size={20} color={theme.colors.primary} />
          </View>
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Quick Links" />
        <SurfaceCard padded={false} style={styles.card}>
          <LinkRow icon="calendar-outline" label="Attendance History" onPress={() => navigation.navigate('StudentAttendance', { studentId: student.id })} />
          <LinkRow icon="trending-up-outline" label="Progress Analytics" onPress={() => navigation.navigate('StudentProgressAnalytics')} divider={false} />
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

function LinkRow({ icon, label, onPress, divider = true }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; divider?: boolean }) {
  const theme = useTeacherTheme();
  return (
    <View style={[styles.linkRow, divider && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={[styles.icon, { backgroundColor: theme.colors.tintTeal }]}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <Text style={[styles.linkLabel, { color: theme.colors.textPrimary }]} onPress={onPress}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  heroMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  section: { gap: 0 },
  card: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
});
