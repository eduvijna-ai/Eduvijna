/** Permissions — grouped module access toggles. */

import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  PrimaryButton,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminData } from '../../../hooks/useAdminData';
import { accentColors } from '../../../theme/accents';

export default function PermissionsScreen() {
  const theme = useTeacherTheme();
  const { permissionGroups } = useAdminData();
  const [granted, setGranted] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    permissionGroups.forEach((group) => group.permissions.forEach((p) => { initial[p.id] = p.granted; }));
    return initial;
  });

  return (
    <TeacherScreen
      header={<ScreenHeader title="Permissions" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Save Changes" icon="save-outline" onPress={() => undefined} />}
    >
      {permissionGroups.map((group) => {
        const accent = accentColors(theme.colors, group.accent);
        return (
          <View key={group.id} style={styles.section}>
            <SectionHeader title={group.title} icon={group.icon} />
            <SurfaceCard padded={false} style={styles.card}>
              {group.permissions.map((perm, index) => (
                <View
                  key={perm.id}
                  style={[
                    styles.row,
                    index < group.permissions.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <View style={[styles.icon, { backgroundColor: accent.bg }]}>
                    <Ionicons name="key-outline" size={16} color={accent.fg} />
                  </View>
                  <View style={styles.text}>
                    <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{perm.label}</Text>
                    <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>{perm.description}</Text>
                  </View>
                  <Switch
                    value={granted[perm.id]}
                    onValueChange={(next) => setGranted((prev) => ({ ...prev, [perm.id]: next }))}
                    trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              ))}
            </SurfaceCard>
          </View>
        );
      })}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  section: { gap: 0 },
  card: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 1 },
});
