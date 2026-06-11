/** My Profile — teacher identity, contact, subjects (read-only demo). */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  HeroCard,
  SurfaceCard,
  SectionHeader,
  Avatar,
  Badge,
  PrimaryButton,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherSession } from '../../../hooks/useTeacherSession';
import { teacherProfile } from '../../../data';

export default function MyProfileScreen() {
  const theme = useTeacherTheme();
  const session = useTeacherSession();
  const name = session.displayName !== 'Teacher' ? session.displayName : teacherProfile.name;

  const contact = [
    { key: 'email', icon: 'mail-outline' as const, label: 'Email', value: teacherProfile.email },
    { key: 'phone', icon: 'call-outline' as const, label: 'Phone', value: teacherProfile.phone },
    { key: 'id', icon: 'id-card-outline' as const, label: 'Employee ID', value: teacherProfile.employeeId },
    { key: 'joined', icon: 'calendar-outline' as const, label: 'Joined', value: teacherProfile.joinedOn },
  ];

  return (
    <TeacherScreen
      header={<ScreenHeader title="My Profile" trailingIcon="create-outline" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Edit Profile" icon="create-outline" variant="outline" onPress={() => undefined} />}
    >
      <HeroCard>
        <View style={styles.heroRow}>
          <Avatar name={name} uri={teacherProfile.avatarUrl} size={64} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{name}</Text>
            <Text style={styles.heroRole}>{teacherProfile.role}</Text>
            <View style={styles.idBadge}><Text style={styles.idText}>{teacherProfile.employeeId}</Text></View>
          </View>
        </View>
      </HeroCard>

      <View style={styles.section}>
        <SectionHeader title="Contact Information" />
        <SurfaceCard padded={false} style={styles.card}>
          {contact.map((item, index) => (
            <View key={item.key} style={[styles.row, index < contact.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.tintTeal }]}>
                <Ionicons name={item.icon} size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.rowValue, { color: theme.colors.textPrimary }]}>{item.value}</Text>
              </View>
            </View>
          ))}
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Subjects Teaching" />
        <SurfaceCard>
          <View style={styles.chips}>
            {teacherProfile.subjects.map((subject) => (
              <Badge key={subject} label={subject} accent="blue" icon="book" />
            ))}
          </View>
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  heroRole: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  idBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 2 },
  idText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  section: { gap: 0 },
  card: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 11 },
  rowValue: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
