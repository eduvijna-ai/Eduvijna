/** Admin Profile — identity card + account details + actions. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@core/hooks/useAuth';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  ListItem,
  PrimaryButton,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useAdminData } from '../../../hooks/useAdminData';

export default function AdminProfileScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const { profile } = useAdminData();
  const auth = useAuth();

  const initials = profile.name.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <TeacherScreen header={<ScreenHeader title="My Profile" />} contentStyle={styles.content}>
      <SurfaceCard style={styles.identityCard}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{profile.name}</Text>
        <Text style={[styles.role, { color: theme.colors.textSecondary }]}>{profile.role}</Text>
        <View style={[styles.schoolPill, { backgroundColor: theme.colors.tintTeal }]}>
          <Ionicons name="business-outline" size={13} color={theme.colors.primary} />
          <Text style={[styles.schoolText, { color: theme.colors.primary }]}>{profile.schoolName}</Text>
        </View>
      </SurfaceCard>

      <SectionHeader title="Account Details" />
      <SurfaceCard padded={false} style={styles.card}>
        <ListItem icon="mail-outline" iconAccent="blue" title="Email" subtitle={profile.email} />
        <ListItem icon="call-outline" iconAccent="green" title="Phone" subtitle={profile.phone} />
        <ListItem icon="calendar-outline" iconAccent="orange" title="Academic Year" subtitle={profile.academicYear} divider={false} />
      </SurfaceCard>

      <SectionHeader title="Management" />
      <SurfaceCard padded={false} style={styles.card}>
        <ListItem icon="shield-checkmark-outline" iconAccent="purple" title="User Roles" showChevron onPress={() => navigation.navigate('UserRoles')} />
        <ListItem icon="lock-closed-outline" iconAccent="pink" title="Permissions" showChevron onPress={() => navigation.navigate('Permissions')} />
        <ListItem icon="settings-outline" iconAccent="teal" title="Settings" divider={false} showChevron onPress={() => navigation.navigate('AdminSettings')} />
      </SurfaceCard>

      <PrimaryButton label="Sign Out" icon="log-out-outline" variant="outline" onPress={() => { void auth.logout(); }} style={styles.signOut} />
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  identityCard: { alignItems: 'center', gap: 6, paddingVertical: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  role: { fontSize: 13 },
  schoolPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: 6 },
  schoolText: { fontSize: 12, fontWeight: '600' },
  card: { paddingHorizontal: 14 },
  signOut: { marginTop: 8 },
});
