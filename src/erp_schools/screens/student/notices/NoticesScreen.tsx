/**
 * Notices — the "Updates" hub: categorized school/class notices & circulars.
 * Reference: assets/student_screens/student notices screen.png
 */

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentModuleHeader,
  IconTabs,
  SearchBar,
  SurfaceCard,
  Badge,
  InfoBanner,
  type IconTab,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentData } from '../../../hooks/useStudentData';
import type { NoticeCategory } from '../../../types/student';

const TABS: IconTab[] = [
  { key: 'all', label: 'All Notices', icon: 'megaphone-outline' },
  { key: 'school', label: 'School Notices', icon: 'business-outline' },
  { key: 'class', label: 'Class Notices', icon: 'people-outline' },
  { key: 'circular', label: 'Circulars', icon: 'document-outline' },
  { key: 'urgent', label: 'Urgent', icon: 'alert-circle-outline' },
];

const CATEGORY_BADGE: Record<NoticeCategory, { label: string; accent: 'red' | 'green' | 'purple' | 'orange' }> = {
  urgent: { label: 'Urgent', accent: 'red' },
  class: { label: 'Class Notice', accent: 'green' },
  school: { label: 'School Notice', accent: 'purple' },
  circular: { label: 'Circular', accent: 'orange' },
};

export default function NoticesScreen() {
  const theme = useTeacherTheme();
  const { notices } = useStudentData();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const base = tab === 'all' ? notices : notices.filter((n) => n.category === tab);
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
  }, [notices, tab, query]);

  return (
    <TeacherScreen
      header={
        <StudentModuleHeader title="Notices" trailingIcon="megaphone-outline" />
      }
      contentStyle={styles.content}
    >
      <View style={styles.tabsWrap}>
        <IconTabs tabs={TABS} activeKey={tab} onChange={setTab} stacked />
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search notices…" />

      <View style={styles.list}>
        {filtered.map((notice) => {
          const accent = accentColors(theme.colors, notice.accent);
          const badge = CATEGORY_BADGE[notice.category];
          return (
            <SurfaceCard key={notice.id}>
              <View style={styles.noticeRow}>
                <View style={[styles.icon, { backgroundColor: accent.bg }]}>
                  <Ionicons name={notice.icon as keyof typeof Ionicons.glyphMap} size={20} color={accent.fg} />
                </View>
                <View style={styles.noticeBody}>
                  <Badge label={badge.label} accent={badge.accent} />
                  <Text style={[styles.noticeTitle, { color: theme.colors.textPrimary }]}>{notice.title}</Text>
                  <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]} numberOfLines={3}>{notice.body}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="business-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{notice.author}</Text>
                    <View style={styles.metaSpacer} />
                    <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{notice.dateLabel} • {notice.timeLabel}</Text>
                  </View>
                </View>
                <Ionicons name={notice.pinned ? 'bookmark' : 'bookmark-outline'} size={16} color={notice.pinned ? theme.colors.primary : theme.colors.textSecondary} />
              </View>
            </SurfaceCard>
          );
        })}
      </View>

      <TouchableOpacity style={[styles.loadMore, { borderColor: theme.colors.border }]} accessibilityRole="button" accessibilityLabel="Load more notices">
        <Text style={[styles.loadMoreText, { color: theme.colors.textSecondary }]}>Load More Notices</Text>
        <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <InfoBanner icon="notifications-outline" title="Stay informed!" text="Enable notifications to never miss an important notice." />
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  tabsWrap: { marginHorizontal: -16, paddingHorizontal: 16 },
  list: { gap: 12 },
  noticeRow: { flexDirection: 'row', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  noticeBody: { flex: 1, gap: 5 },
  noticeTitle: { fontSize: 14, fontWeight: '700' },
  noticeText: { fontSize: 12, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' },
  metaText: { fontSize: 10 },
  metaSpacer: { flex: 1 },
  loadMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  loadMoreText: { fontSize: 13, fontWeight: '600' },
});
