/** Settings — app preferences (theme reuses the existing ThemeContext). */

import React from 'react';
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
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  ListItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';

async function handlePrivacyPolicy() {
  const opened = await openPrivacyPolicy();
  if (!opened) Alert.alert('Privacy Policy', privacyPolicyOpenFailureMessage());
}
async function handleDeletionRequest() {
  const opened = await openAccountDeletionPage();
  if (!opened) Alert.alert('Open deletion-request page', accountDeletionOpenFailureMessage());
}

export default function SettingsScreen() {
  const theme = useTeacherTheme();
  const { isDark, setThemeMode } = useTheme();

  return (
    <TeacherScreen header={<ScreenHeader title="Settings" />} contentStyle={styles.content}>
      <SectionHeader title="Appearance" />
      <SurfaceCard>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: theme.colors.tintPurple }]}>
            <Ionicons name="moon-outline" size={18} color={theme.colors.onTintPurple} />
          </View>
          <View style={styles.text}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Dark Mode</Text>
            <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>Uses the app-wide theme preference</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={(next) => setThemeMode(next ? 'dark' : 'light')}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>
      </SurfaceCard>

      <SectionHeader title="Notifications" />
      <SurfaceCard padded={false} style={styles.card}>
        <ListItem icon="notifications-outline" iconAccent="orange" title="Push Notifications" subtitle="Assignments, attendance, messages" trailing={<Toggle defaultOn />} />
        <ListItem icon="mail-outline" iconAccent="blue" title="Email Digest" subtitle="Weekly summary" divider={false} trailing={<Toggle />} />
      </SurfaceCard>

      <SectionHeader title="About" />
      <SurfaceCard padded={false} style={styles.card}>
        <ListItem icon="information-circle-outline" iconAccent="teal" title="Version" trailing={<Text style={{ color: theme.colors.textSecondary }}>1.0.0</Text>} />
        <ListItem icon="document-text-outline" iconAccent="green" title="Privacy Policy" showChevron onPress={handlePrivacyPolicy} />
        <ListItem icon="trash-outline" iconAccent="orange" title="Request Account Deletion" subtitle="Opens deletion-request page" showChevron onPress={handleDeletionRequest} />
        <ListItem icon="help-circle-outline" iconAccent="purple" title="Help & Support" divider={false} showChevron onPress={() => undefined} />
      </SurfaceCard>
    </TeacherScreen>
  );
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const theme = useTeacherTheme();
  const [on, setOn] = React.useState(defaultOn);
  return (
    <Switch
      value={on}
      onValueChange={setOn}
      trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
      thumbColor="#FFFFFF"
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 1 },
  card: { paddingHorizontal: 14 },
});
