/**
 * Student Engagement hub — web StudentEngagementTab parity.
 * Tabs: Councils, Members, Grievances, Events, Registrations, Gallery.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SelectField,
  TextField,
  ListItem,
  EmptyState,
  ScreenLoader,
  PrimaryButton,
  Badge,
} from '../../components';
import { useTeacherTheme } from '../../theme/useTeacherTheme';
import { useEngagementData } from '../../hooks/useEngagementData';
import {
  ENGAGEMENT_TABS,
  COUNCIL_TYPES,
  MEMBER_ROLES,
  GRIEVANCE_TYPES,
  GRIEVANCE_STATUSES,
  EVENT_TYPES,
  EVENT_STATUSES,
  GALLERY_CATEGORIES,
  enumLabel,
  statusTone,
  type EngagementTabKey,
} from '../../utils/engagementMeta';

type Nav = NativeStackNavigationProp<{
  Engagement: undefined;
  CreateEngagement: { kind: EngagementTabKey; recordId?: number };
}>;

export default function EngagementHubScreen() {
  const theme = useTeacherTheme();
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<EngagementTabKey>('councils');
  const eng = useEngagementData(tab);
  const [pulling, setPulling] = useState(false);

  const refetchRef = useRef(eng.refetch);
  refetchRef.current = eng.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchRef.current();
    }, []),
  );

  const addLabel = useMemo(() => {
    switch (tab) {
      case 'councils':
        return 'Add Council';
      case 'members':
        return 'Add Member';
      case 'grievances':
        return 'File Grievance';
      case 'events':
        return 'Add Event';
      case 'registrations':
        return 'Register Student';
      case 'gallery':
        return 'Add Media';
      default:
        return 'Add';
    }
  }, [tab]);

  const filterOptions = useMemo(() => {
    switch (tab) {
      case 'councils':
        return [
          { label: 'All Types', value: '' },
          ...COUNCIL_TYPES.map((c) => ({ label: enumLabel(c), value: c })),
        ];
      case 'members':
        return [
          { label: 'All Roles', value: '' },
          ...MEMBER_ROLES.map((c) => ({ label: enumLabel(c), value: c })),
        ];
      case 'grievances':
        return [
          { label: 'All Types', value: '' },
          ...GRIEVANCE_TYPES.map((c) => ({ label: enumLabel(c), value: c })),
        ];
      case 'events':
        return [
          { label: 'All Types', value: '' },
          ...EVENT_TYPES.map((c) => ({ label: enumLabel(c), value: c })),
        ];
      case 'gallery':
        return [
          { label: 'All Categories', value: '' },
          ...GALLERY_CATEGORIES.map((c) => ({ label: enumLabel(c), value: c })),
        ];
      default:
        return [];
    }
  }, [tab]);

  const statusFilterOptions = useMemo(() => {
    if (tab === 'grievances') {
      return [
        { label: 'All Statuses', value: '' },
        ...GRIEVANCE_STATUSES.map((c) => ({ label: enumLabel(c), value: c })),
      ];
    }
    if (tab === 'events') {
      return [
        { label: 'All Statuses', value: '' },
        ...EVENT_STATUSES.map((c) => ({ label: enumLabel(c), value: c })),
      ];
    }
    return [];
  }, [tab]);

  const onDeactivate = (id: number, title: string) => {
    Alert.alert('Deactivate?', `Deactivate “${title}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const ok = await eng.deactivateRecord(id);
            if (!ok) Alert.alert('Failed', eng.error || 'Could not deactivate.');
          })();
        },
      },
    ]);
  };

  const onPull = useCallback(async () => {
    setPulling(true);
    try {
      await eng.refetch();
    } finally {
      setPulling(false);
    }
  }, [eng.refetch]);

  if (eng.loading && eng.rows.length === 0) {
    return (
      <TeacherScreen header={<ScreenHeader title="Engagement" />}>
        <ScreenLoader message="Loading engagement…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Engagement"
          trailingIcon={eng.canManage ? 'add' : undefined}
          onTrailingPress={
            eng.canManage
              ? () => navigation.navigate('CreateEngagement', { kind: tab })
              : undefined
          }
        />
      }
      contentStyle={styles.content}
      refreshing={pulling}
      onRefresh={() => void onPull()}
      footer={
        eng.canManage ? (
          <PrimaryButton
            label={addLabel}
            icon="add-circle-outline"
            variant="gradient"
            onPress={() => navigation.navigate('CreateEngagement', { kind: tab })}
          />
        ) : undefined
      }
    >
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.heroTop}>
          <View style={[styles.pill, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.pillText, { color: theme.colors.textPrimary }]}>
              Student Life
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.pillText, { color: theme.colors.textPrimary }]}>
              School ERP
            </Text>
          </View>
        </View>
        <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
          Student Engagement
        </Text>
        <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
          Manage councils, grievances, events, registrations, and campus gallery.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {ENGAGEMENT_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tabChip,
                {
                  backgroundColor: active
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons
                name={t.icon}
                size={14}
                color={active ? '#fff' : theme.colors.textSecondary}
              />
              <Text
                style={{
                  color: active ? '#fff' : theme.colors.textPrimary,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filterOptions.length > 0 ? (
        <SelectField
          options={filterOptions}
          value={eng.filterA}
          onChange={eng.setFilterA}
          placeholder={filterOptions[0]?.label}
        />
      ) : null}

      {tab === 'registrations' ? (
        <TextField
          value={eng.filterA}
          onChangeText={eng.setFilterA}
          placeholder="Event ID filter"
          keyboardType="number-pad"
        />
      ) : null}

      {statusFilterOptions.length > 0 ? (
        <SelectField
          options={statusFilterOptions}
          value={eng.filterB}
          onChange={eng.setFilterB}
          placeholder="All Statuses"
        />
      ) : null}

      {eng.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{eng.error}</Text>
      ) : null}

      <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
        {eng.total} record{eng.total === 1 ? '' : 's'}
      </Text>

      {eng.rows.length === 0 ? (
        <EmptyState
          icon="sparkles-outline"
          title={`No ${tab}`}
          message={
            eng.canManage
              ? `Use “${addLabel}” to create the first record.`
              : 'Nothing here yet for this filter.'
          }
          ctaLabel={eng.canManage ? addLabel : undefined}
          onCtaPress={
            eng.canManage
              ? () => navigation.navigate('CreateEngagement', { kind: tab })
              : undefined
          }
        />
      ) : tab === 'gallery' ? (
        <View style={styles.galleryGrid}>
          {eng.rows.map((row) => {
            const url = String(row.raw.media_url || row.meta || '');
            const isImage =
              String(row.raw.media_type || 'image') === 'image' && Boolean(url);
            return (
              <TouchableOpacity
                key={row.id}
                style={[
                  styles.galleryCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={
                  eng.canManage
                    ? () =>
                        navigation.navigate('CreateEngagement', {
                          kind: 'gallery',
                          recordId: row.numericId,
                        })
                    : undefined
                }
                activeOpacity={0.85}
              >
                {isImage ? (
                  <Image source={{ uri: url }} style={styles.galleryImage} />
                ) : (
                  <View
                    style={[
                      styles.galleryPlaceholder,
                      { backgroundColor: theme.colors.primary + '18' },
                    ]}
                  >
                    <Ionicons
                      name={
                        String(row.raw.media_type) === 'video'
                          ? 'videocam-outline'
                          : 'document-outline'
                      }
                      size={28}
                      color={theme.colors.primary}
                    />
                  </View>
                )}
                <View style={styles.galleryBody}>
                  <Text
                    style={[styles.galleryTitle, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {row.title}
                  </Text>
                  <Text
                    style={{ color: theme.colors.textSecondary, fontSize: 11 }}
                    numberOfLines={1}
                  >
                    #{row.numericId} · {row.subtitle}
                  </Text>
                  <View style={styles.galleryActions}>
                    <Badge label={enumLabel(row.status)} accent={statusTone(row.status)} />
                    {eng.canManage && row.isActive ? (
                      <TouchableOpacity
                        onPress={() => onDeactivate(row.numericId, row.title)}
                        hitSlop={8}
                      >
                        <Text style={{ color: theme.colors.danger, fontSize: 11, fontWeight: '700' }}>
                          Deactivate
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <SurfaceCard padded={false} style={styles.listCard}>
          {eng.rows.map((row, index) => (
            <ListItem
              key={row.id}
              icon={
                ENGAGEMENT_TABS.find((t) => t.key === tab)?.icon || 'ellipse-outline'
              }
              iconAccent={statusTone(row.status)}
              title={row.title}
              subtitle={`#${row.numericId} · ${row.subtitle}`}
              divider={index < eng.rows.length - 1}
              onPress={
                eng.canManage
                  ? () =>
                      navigation.navigate('CreateEngagement', {
                        kind: tab,
                        recordId: row.numericId,
                      })
                  : undefined
              }
              trailing={
                <View style={styles.trailing}>
                  <Badge label={enumLabel(row.status)} accent={statusTone(row.status)} />
                  {row.meta ? (
                    <Text
                      style={[styles.meta, { color: theme.colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {row.meta}
                    </Text>
                  ) : null}
                  {eng.canManage ? (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('CreateEngagement', {
                            kind: tab,
                            recordId: row.numericId,
                          })
                        }
                        hitSlop={8}
                      >
                        <Text
                          style={{
                            color: theme.colors.info,
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        >
                          Edit
                        </Text>
                      </TouchableOpacity>
                      {row.isActive ? (
                        <TouchableOpacity
                          onPress={() => onDeactivate(row.numericId, row.title)}
                          hitSlop={8}
                        >
                          <Text
                            style={{
                              color: theme.colors.danger,
                              fontSize: 12,
                              fontWeight: '700',
                            }}
                          >
                            Deactivate
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              }
            />
          ))}
        </SurfaceCard>
      )}

      {eng.pages > 1 ? (
        <View style={styles.pager}>
          <TouchableOpacity
            disabled={eng.page <= 1}
            onPress={() => eng.setPage(Math.max(1, eng.page - 1))}
          >
            <Text
              style={{
                color: eng.page <= 1 ? theme.colors.textSecondary : theme.colors.primary,
                fontWeight: '700',
              }}
            >
              Previous
            </Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>
            {eng.page} / {eng.pages} ({eng.total})
          </Text>
          <TouchableOpacity
            disabled={eng.page >= eng.pages}
            onPress={() => eng.setPage(Math.min(eng.pages, eng.page + 1))}
          >
            <Text
              style={{
                color:
                  eng.page >= eng.pages
                    ? theme.colors.textSecondary
                    : theme.colors.primary,
                fontWeight: '700',
              }}
            >
              Next
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  heroCard: {
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 11, fontWeight: '600' },
  heroTitle: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  heroSub: { fontSize: 13, lineHeight: 18 },
  tabsRow: { gap: 8, paddingVertical: 2 },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  count: { fontSize: 12, fontWeight: '600' },
  listCard: { paddingHorizontal: 14 },
  trailing: { alignItems: 'flex-end', gap: 4, maxWidth: 130 },
  meta: { fontSize: 10, textAlign: 'right', maxWidth: 120 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  pager: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  galleryCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    maxWidth: '48%',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  galleryImage: { width: '100%', height: 110, backgroundColor: '#E2E8F0' },
  galleryPlaceholder: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryBody: { padding: 10, gap: 4 },
  galleryTitle: { fontSize: 13, fontWeight: '700' },
  galleryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
