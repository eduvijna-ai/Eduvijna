/**
 * Notice Board — class/group/school notices with create actions + filters.
 * Reference: assets/teachers_screens/teachers_notice_board.png
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  ClassContextBanner,
  QuickActionGrid,
  SurfaceCard,
  SearchBar,
  FilterChips,
  Badge,
  InfoBanner,
  type QuickAction,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { accentColors, type AccentKey } from '../../../theme/accents';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { notices } from '../../../data';
import type { TeacherStackParamList } from '../../../types/navigation';
import type { Notice, NoticeScope } from '../../../types/domain';

const SCOPE_META: Record<NoticeScope, { label: string; accent: AccentKey; icon: keyof typeof Ionicons.glyphMap }> = {
  class: { label: 'CLASS NOTICE', accent: 'green', icon: 'megaphone-outline' },
  group: { label: 'GROUP NOTICE', accent: 'orange', icon: 'people-outline' },
  school: { label: 'SCHOOL NOTICE', accent: 'purple', icon: 'business-outline' },
};

const FILTERS: ChipOption[] = [
  { key: 'all', label: 'All Notices' },
  { key: 'class', label: 'Class Notices' },
  { key: 'group', label: 'Group Notices' },
  { key: 'school', label: 'School Notices' },
  { key: 'scheduled', label: 'Scheduled' },
];

export default function NoticeBoardScreen() {
  const navigation = useTeacherNavigation();
  const route = useRoute<RouteProp<TeacherStackParamList, 'NoticeBoard'>>();
  const { getClassById } = useTeacherData();
  const classInfo = getClassById(route.params?.classId);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const actions: QuickAction[] = [
    { key: 'class', icon: 'megaphone-outline', label: 'Create Notice', accent: 'green', onPress: () => navigation.navigate('CreateNotice', { scope: 'class' }) },
    { key: 'group', icon: 'people-outline', label: 'Create Notice', accent: 'purple', onPress: () => navigation.navigate('CreateNotice', { scope: 'group' }) },
    { key: 'school', icon: 'business-outline', label: 'Create Notice', accent: 'orange', onPress: () => navigation.navigate('CreateNotice', { scope: 'school' }) },
    { key: 'scheduled', icon: 'time-outline', label: 'Scheduled', accent: 'blue', onPress: () => navigation.navigate('ScheduledNotice') },
  ];

  const filtered = useMemo(() => {
    return notices.filter((notice) => {
      const matchesQuery = `${notice.title} ${notice.body}`.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === 'all' || notice.scope === filter;
      return matchesQuery && matchesFilter;
    });
  }, [query, filter]);

  return (
    <TeacherScreen
      header={<ScreenHeader title="Notice Board" trailingIcon="add" onTrailingPress={() => navigation.navigate('CreateNotice', {})} />}
      contentStyle={styles.content}
    >
      {classInfo ? (
        <ClassContextBanner code={classInfo.code} name={classInfo.name} subject={classInfo.subject} room={classInfo.room} studentCount={classInfo.studentCount} />
      ) : null}

      <QuickActionGrid actions={actions} columns={4} />

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search notices…" />
      <FilterChips options={FILTERS} activeKey={filter} onChange={setFilter} />

      {filtered.map((notice) => (
        <NoticeCard key={notice.id} notice={notice} />
      ))}

      <InfoBanner tone="tip" text="Pin important notices to highlight them for easy access." />
    </TeacherScreen>
  );
}

function NoticeCard({ notice }: { notice: Notice }) {
  const theme = useTeacherTheme();
  const meta = SCOPE_META[notice.scope];
  const accent = accentColors(theme.colors, meta.accent);

  return (
    <SurfaceCard>
      <View style={styles.noticeTop}>
        <View style={[styles.noticeIcon, { backgroundColor: accent.bg }]}>
          <Ionicons name={meta.icon} size={20} color={accent.fg} />
        </View>
        <View style={styles.noticeBody}>
          <View style={styles.noticeTagRow}>
            <Badge label={meta.label} accent={meta.accent} />
            <View style={styles.noticeRight}>
              <Text style={[styles.noticeDate, { color: theme.colors.textSecondary }]}>{notice.date}</Text>
              <Ionicons name="ellipsis-vertical" size={16} color={theme.colors.textSecondary} />
            </View>
          </View>
          <Text style={[styles.noticeTitle, { color: theme.colors.textPrimary }]}>{notice.title}</Text>
          <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]} numberOfLines={3}>{notice.body}</Text>
          <View style={[styles.noticeFooter, { borderTopColor: theme.colors.border }]}>
            <View style={styles.audienceRow}>
              <Ionicons name="people-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={[styles.audienceText, { color: theme.colors.textSecondary }]}>{notice.audience}</Text>
            </View>
            <View style={styles.footerRight}>
              {notice.pinned ? <Badge label="Pinned" accent="green" icon="pin" /> : null}
              <Text style={[styles.author, { color: theme.colors.textSecondary }]}>{notice.author}</Text>
            </View>
          </View>
        </View>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  noticeTop: { flexDirection: 'row', gap: 12 },
  noticeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  noticeBody: { flex: 1, gap: 6 },
  noticeTagRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noticeRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noticeDate: { fontSize: 11 },
  noticeTitle: { fontSize: 15, fontWeight: '700' },
  noticeText: { fontSize: 13, lineHeight: 18 },
  noticeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, marginTop: 2, borderTopWidth: StyleSheet.hairlineWidth },
  audienceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  audienceText: { fontSize: 12 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  author: { fontSize: 12, fontWeight: '500' },
});
