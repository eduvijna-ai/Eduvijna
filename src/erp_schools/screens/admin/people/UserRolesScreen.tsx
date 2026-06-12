/** User Roles — list of roles with assigned-user counts; tap → Permissions. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  ListItem,
  Badge,
  PrimaryButton,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useAdminData } from '../../../hooks/useAdminData';

export default function UserRolesScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const { roles } = useAdminData();

  return (
    <TeacherScreen
      header={<ScreenHeader title="User Roles" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Create Role" icon="add" onPress={() => undefined} />}
    >
      <View>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {roles.length} roles · {roles.reduce((sum, r) => sum + r.userCount, 0)} users
        </Text>
      </View>

      <SectionHeader title="Roles" />
      <SurfaceCard padded={false} style={styles.card}>
        {roles.map((role, index) => (
          <ListItem
            key={role.id}
            icon={role.icon}
            iconAccent={role.accent}
            title={role.name}
            subtitle={role.description}
            divider={index < roles.length - 1}
            showChevron
            onPress={() => navigation.navigate('Permissions')}
            trailing={<Badge label={`${role.userCount}`} accent={role.accent} icon="people-outline" />}
          />
        ))}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  subtitle: { fontSize: 13 },
  card: { paddingHorizontal: 14 },
});
