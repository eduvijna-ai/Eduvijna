/** Settings — preferences (theme, notifications) + account + about. screens.md "Settings". */

import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  accountDeletionOpenFailureMessage,
  openAccountDeletionPage,
  openPrivacyPolicy,
  privacyPolicyOpenFailureMessage,
} from '@core/config/legal';
import { useTheme } from '@context/ThemeContext';
import {
  TeacherScreen,
  StudentModuleHeader,
  SurfaceCard,
  SectionHeader,
  ListItem,
} from '../../../components';
import { accentColors, type AccentKey } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';

async function handlePrivacyPolicy() {
  const opened = await openPrivacyPolicy();
  if (!opened) Alert.alert('Privacy Policy', privacyPolicyOpenFailureMessage());
}
async function handleDeletionRequest() {
  const opened = await openAccountDeletionPage();
  if (!opened) Alert.alert('Open deletion-request page', accountDeletionOpenFailureMessage());
}

function ToggleRow({
  icon,
  accent,
  label,
  value,
  onValueChange,
  divider,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accent: AccentKey;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  divider?: boolean;
}) {
  const theme = useTeacherTheme();
  const tint = accentColors(theme.colors, accent);
  return (
    <View
      style={[
        styles.row,
        divider && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: tint.bg }]}>
        <Ionicons name={icon} size={18} color={tint.fg} />
      </View>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { isDark, toggleTheme } = useTheme();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  return (
    <TeacherScreen header={<StudentModuleHeader title="Settings" />} contentStyle={styles.content}>
      <View style={styles.section}>
        <SectionHeader title="Preferences" />
        <SurfaceCard padded={false} style={styles.card}>
          <ToggleRow icon="moon-outline" accent="purple" label="Dark Mode" value={isDark} onValueChange={() => toggleTheme()} divider />
          <ToggleRow icon="notifications-outline" accent="orange" label="Push Notifications" value={pushEnabled} onValueChange={setPushEnabled} divider />
          <ToggleRow icon="mail-outline" accent="blue" label="Email Digest" value={emailDigest} onValueChange={setEmailDigest} />
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Account" />
        <SurfaceCard padded={false} style={styles.card}>
          <ListItem icon="lock-closed-outline" iconAccent="teal" title="Change Password" showChevron />
          <ListItem icon="shield-checkmark-outline" iconAccent="green" title="Privacy Policy" showChevron onPress={handlePrivacyPolicy} />
          <ListItem icon="trash-outline" iconAccent="orange" title="Request Account Deletion" subtitle="Opens deletion-request page" showChevron onPress={handleDeletionRequest} />
          <ListItem icon="language-outline" iconAccent="blue" title="Language" subtitle="English" divider={false} showChevron />
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="About" />
        <SurfaceCard padded={false} style={styles.card}>
          <ListItem icon="information-circle-outline" iconAccent="blue" title="App Version" subtitle="1.0.0" />
          <ListItem icon="document-text-outline" iconAccent="purple" title="Terms & Conditions" showChevron />
          <ListItem icon="help-circle-outline" iconAccent="orange" title="Help & Support" divider={false} showChevron />
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  section: { gap: 0 },
  card: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
});
