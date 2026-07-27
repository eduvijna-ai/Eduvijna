/**
 * Notice Board — mobile card UI + web NoticesTab CRUD parity.
 * List / search / category filter / view / edit / deactivate / create.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SearchBar,
  FilterChips,
  Badge,
  EmptyState,
  ScreenLoader,
  InfoBanner,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { accentColors, type AccentKey } from '../../../theme/accents';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherNotices } from '../../../hooks/useTeacherNotices';
import { NOTICE_CATEGORIES, type Notice } from '../../../types/domain';

const CATEGORY_ACCENT: Record<string, AccentKey> = {
  general: 'blue',
  academic: 'purple',
  fee: 'orange',
  event: 'purple',
  exam: 'pink',
  holiday: 'green',
};

const FILTERS: ChipOption[] = [
  { key: 'all', label: 'All Categories' },
  ...NOTICE_CATEGORIES.map((c) => ({
    key: c,
    label: c.charAt(0).toUpperCase() + c.slice(1),
  })),
];

export default function NoticeBoardScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [debouncedQ, setDebouncedQ] = useState('');

  // Light debounce for API search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { notices, total, pinnedCount, status, error, refetch, deactivateNotice, saving } =
    useTeacherNotices({
      category: category === 'all' ? undefined : category,
      q: debouncedQ || undefined,
    });

  // Refetch when returning from create/edit/detail (skip first mount — hook already loads)
  const firstFocus = React.useRef(true);
  useFocusEffect(
    React.useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void refetch();
    }, [refetch]),
  );

  const filtered = useMemo(() => {
    if (!debouncedQ) return notices;
    const q = debouncedQ.toLowerCase();
    return notices.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        String(n.category).toLowerCase().includes(q),
    );
  }, [notices, debouncedQ]);

  const openActions = (notice: Notice) => {
    const doEdit = () =>
      navigation.navigate('CreateNotice', { noticeId: notice.noticeId });
    const doView = () =>
      navigation.navigate('NoticeDetail', { noticeId: notice.noticeId });
    const doDeactivate = () => {
      Alert.alert('Deactivate notice?', `"${notice.title}" will be deactivated.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            void deactivateNotice(notice.noticeId).then((ok) => {
              if (!ok) Alert.alert('Failed', 'Could not deactivate notice.');
            });
          },
        },
      ]);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'View', 'Edit', 'Deactivate'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (i) => {
          if (i === 1) doView();
          if (i === 2) doEdit();
          if (i === 3) doDeactivate();
        },
      );
    } else {
      Alert.alert(notice.title, undefined, [
        { text: 'View', onPress: doView },
        { text: 'Edit', onPress: doEdit },
        { text: 'Deactivate', style: 'destructive', onPress: doDeactivate },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const bootLoading = status === 'idle' || status === 'loading';

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Notice Board"
          trailingIcon="add"
          onTrailingPress={() => navigation.navigate('CreateNotice', {})}
        />
      }
      contentStyle={styles.content}
      refreshing={status === 'loading' || saving}
      onRefresh={() => void refetch()}
    >
      <View style={styles.statsRow}>
        <StatChip label="On this page" value={filtered.length} />
        <StatChip label="Pinned" value={pinnedCount} />
        <StatChip label="Total" value={total} />
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search notices…"
      />
      <FilterChips options={FILTERS} activeKey={category} onChange={setCategory} />

      {error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text>
      ) : null}

      {bootLoading ? (
        <ScreenLoader message="Loading notices…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="megaphone-outline"
          title="No notices found"
          message="Create a notice to keep students and staff informed."
          ctaLabel="New Notice"
          onCtaPress={() => navigation.navigate('CreateNotice', {})}
        />
      ) : (
        filtered.map((notice) => (
          <NoticeCard
            key={notice.id}
            notice={notice}
            onPress={() =>
              navigation.navigate('NoticeDetail', { noticeId: notice.noticeId })
            }
            onMore={() => openActions(notice)}
          />
        ))
      )}

      <InfoBanner
        tone="tip"
        text="Pin important notices to highlight them for easy access."
      />
    </TeacherScreen>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  const theme = useTeacherTheme();
  return (
    <View
      style={[
        styles.statChip,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.statValue, { color: theme.colors.primary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function NoticeCard({
  notice,
  onPress,
  onMore,
}: {
  notice: Notice;
  onPress: () => void;
  onMore: () => void;
}) {
  const theme = useTeacherTheme();
  const cat = String(notice.category || 'general').toLowerCase();
  const accentKey = CATEGORY_ACCENT[cat] || 'teal';
  const accent = accentColors(theme.colors, accentKey);
  const catLabel = cat.toUpperCase();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <SurfaceCard>
        <View style={styles.noticeTop}>
          <View style={[styles.noticeIcon, { backgroundColor: accent.bg }]}>
            <Ionicons name="megaphone-outline" size={20} color={accent.fg} />
          </View>
          <View style={styles.noticeBody}>
            <View style={styles.noticeTagRow}>
              <Badge label={catLabel} accent={accentKey} />
              <View style={styles.noticeRight}>
                <Text style={[styles.noticeDate, { color: theme.colors.textSecondary }]}>
                  {notice.date}
                </Text>
                <TouchableOpacity onPress={onMore} hitSlop={10}>
                  <Ionicons
                    name="ellipsis-vertical"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.noticeTitle, { color: theme.colors.textPrimary }]}>
              {notice.title}
            </Text>
            <Text
              style={[styles.noticeText, { color: theme.colors.textSecondary }]}
              numberOfLines={3}
            >
              {notice.body}
            </Text>
            <View style={[styles.noticeFooter, { borderTopColor: theme.colors.border }]}>
              <View style={styles.audienceRow}>
                <Ionicons name="pricetag-outline" size={13} color={theme.colors.textSecondary} />
                <Text style={[styles.audienceText, { color: theme.colors.textSecondary }]}>
                  {cat}
                </Text>
              </View>
              <View style={styles.footerRight}>
                {notice.pinned ? <Badge label="Pinned" accent="green" icon="pin" /> : null}
                <Text style={[styles.author, { color: theme.colors.textSecondary }]}>
                  {notice.author}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </SurfaceCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600' },
  noticeTop: { flexDirection: 'row', gap: 12 },
  noticeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeBody: { flex: 1, gap: 6 },
  noticeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noticeRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noticeDate: { fontSize: 11 },
  noticeTitle: { fontSize: 15, fontWeight: '700' },
  noticeText: { fontSize: 13, lineHeight: 18 },
  noticeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  audienceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  audienceText: { fontSize: 12 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  author: { fontSize: 12, fontWeight: '500' },
});
