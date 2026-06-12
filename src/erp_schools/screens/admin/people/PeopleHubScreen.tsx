/** People — hub for all people-management modules (People tab). */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TeacherScreen, SurfaceCard, SectionHeader, ListItem, StatGrid } from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useAdminData } from '../../../hooks/useAdminData';
import type { AdminStackParamList } from '../../../types/navigation';
import type { AccentKey } from '../../../theme/accents';
import type { AdminMetric } from '../../../types/admin';

interface HubLink {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: AccentKey;
  route: keyof AdminStackParamList;
}

const DIRECTORY: HubLink[] = [
  { label: 'Student Management', subtitle: 'Directory, admissions & at-risk', icon: 'school-outline', accent: 'teal', route: 'StudentManagement' },
  { label: 'Teacher Management', subtitle: 'Staff, attendance & performance', icon: 'person-outline', accent: 'blue', route: 'TeacherManagement' },
  { label: 'Parent Management', subtitle: 'Guardians & engagement', icon: 'people-circle-outline', accent: 'green', route: 'ParentManagement' },
  { label: 'Staff Management', subtitle: 'Admin & support staff', icon: 'briefcase-outline', accent: 'orange', route: 'StaffManagement' },
];

const ACCESS: HubLink[] = [
  { label: 'User Roles', subtitle: 'Roles & assigned users', icon: 'shield-checkmark-outline', accent: 'purple', route: 'UserRoles' },
  { label: 'Permissions', subtitle: 'Module access control', icon: 'lock-closed-outline', accent: 'pink', route: 'Permissions' },
];

export default function PeopleHubScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const { students, teachers, parents, staff } = useAdminData();

  const kpis: AdminMetric[] = [
    { key: 'students', icon: 'school-outline', value: students.kpis[0].value, label: 'Students', accent: 'teal' },
    { key: 'teachers', icon: 'person-outline', value: teachers.kpis[0].value, label: 'Teachers', accent: 'blue' },
    { key: 'parents', icon: 'people-circle-outline', value: parents.kpis[0].value, label: 'Parents', accent: 'green' },
    { key: 'staff', icon: 'briefcase-outline', value: staff.kpis[0].value, label: 'Staff', accent: 'orange' },
  ];

  return (
    <TeacherScreen contentStyle={styles.content}>
      <View>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>People</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Manage everyone in your school</Text>
      </View>

      <StatGrid items={kpis} columns={4} variant="tinted" />

      <View style={styles.section}>
        <SectionHeader title="Directory" />
        <SurfaceCard padded={false} style={styles.menuCard}>
          {DIRECTORY.map((link, index) => (
            <ListItem
              key={link.label}
              icon={link.icon}
              iconAccent={link.accent}
              title={link.label}
              subtitle={link.subtitle}
              divider={index < DIRECTORY.length - 1}
              showChevron
              onPress={() => navigation.navigate(link.route as 'StudentManagement')}
            />
          ))}
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Access Control" />
        <SurfaceCard padded={false} style={styles.menuCard}>
          {ACCESS.map((link, index) => (
            <ListItem
              key={link.label}
              icon={link.icon}
              iconAccent={link.accent}
              title={link.label}
              subtitle={link.subtitle}
              divider={index < ACCESS.length - 1}
              showChevron
              onPress={() => navigation.navigate(link.route as 'UserRoles')}
            />
          ))}
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  section: { gap: 0 },
  menuCard: { paddingHorizontal: 14 },
});
