/**
 * Announcements — category-filterable list of school announcements with pinned
 * highlighting. Reference: assets/admin_screens/admin announcements screen.png
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  IconTabs,
  Badge,
  EmptyState,
  PrimaryButton,
  type IconTab,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminData } from '../../../hooks/useAdminData';
import { accentColors } from '../../../theme/accents';
import type { AnnouncementCategory } from '../../../types/admin';

const TABS: IconTab[] = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'general', label: 'General', icon: 'megaphone-outline' },
  { key: 'academics', label: 'Academics', icon: 'book-outline' },
  { key: 'events', label: 'Events', icon: 'trophy-outline' },
  { key: 'exams', label: 'Exams', icon: 'clipboard-outline' },
  { key: 'transport', label: 'Transport', icon: 'bus-outline' },
];

export default function AnnouncementsScreen() {
  const theme = useTeacherTheme();
  const { announcements } = useAdminData();
  const [tab, setTab] = useState('all');

  const filtered = useMemo(
    () => (tab === 'all' ? announcements : announcements.filter((a) => a.category === (tab as AnnouncementCategory))),
    [announcements, tab],
  );

  return (
    <TeacherScreen
      header={<ScreenHeader title="Announcements" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="New Announcement" icon="add" onPress={() => undefined} />}
    >
      <IconTabs tabs={TABS} activeKey={tab} onChange={setTab} />

      <View style={styles.list}>
        {filtered.length === 0 ? (
          <SurfaceCard>
            <EmptyState icon="megaphone-outline" title="No announcements" message="Nothing in this category yet." />
          </SurfaceCard>
        ) : (
          filtered.map((item) => {
            const accent = accentColors(theme.colors, item.accent);
            return (
              <SurfaceCard key={item.id} style={styles.card}>
                <View style={styles.headerRow}>
                  <View style={[styles.icon, { backgroundColor: accent.bg }]}>
                    <Ionicons name={item.icon} size={18} color={accent.fg} />
                  </View>
                  <View style={styles.headerText}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.pinned ? <Ionicons name="pin" size={14} color={theme.colors.primary} /> : null}
                    </View>
                    <Badge label={item.categoryLabel} accent={item.accent} />
                  </View>
                </View>
                <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{item.body}</Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{item.author}</Text>
                  <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{item.dateLabel}</Text>
                </View>
              </SurfaceCard>
            );
          })
        )}
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4 },
  list: { gap: 12, marginTop: 12 },
  card: { gap: 10 },
  headerRow: { flexDirection: 'row', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: { flex: 1, fontSize: 15, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 19 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 12 },
});
