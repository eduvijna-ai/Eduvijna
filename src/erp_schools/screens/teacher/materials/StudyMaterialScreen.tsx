/**
 * Study Material — class materials with categories, list + storage usage.
 * Reference: assets/teachers_screens/teachers_study materials.png
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
  SectionHeader,
  SearchBar,
  FilterChips,
  Badge,
  ProgressBar,
  InfoBanner,
  PrimaryButton,
  type QuickAction,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { accentColors, type AccentKey } from '../../../theme/accents';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { studyMaterials, materialsStorage } from '../../../data';
import type { TeacherStackParamList } from '../../../types/navigation';
import type { MaterialType, StudyMaterialItem } from '../../../types/domain';

const TYPE_META: Record<MaterialType, { label: string; accent: AccentKey; icon: keyof typeof Ionicons.glyphMap }> = {
  pdf: { label: 'PDF', accent: 'green', icon: 'document-text' },
  ppt: { label: 'PPT', accent: 'purple', icon: 'easel' },
  doc: { label: 'DOC', accent: 'orange', icon: 'document' },
  video: { label: 'MP4', accent: 'blue', icon: 'videocam' },
  link: { label: 'URL', accent: 'purple', icon: 'link' },
  other: { label: 'FILE', accent: 'teal', icon: 'folder' },
};

const FILTERS: ChipOption[] = [
  { key: 'all', label: 'All' },
  { key: 'pdf', label: 'Notes' },
  { key: 'doc', label: 'Worksheets' },
  { key: 'ppt', label: 'Presentations' },
  { key: 'video', label: 'Videos' },
  { key: 'link', label: 'Links' },
  { key: 'other', label: 'Others' },
];

export default function StudyMaterialScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const route = useRoute<RouteProp<TeacherStackParamList, 'StudyMaterial'>>();
  const { getClassById } = useTeacherData();
  const classInfo = getClassById(route.params?.classId);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const actions: QuickAction[] = [
    { key: 'mine', icon: 'folder-outline', label: 'My Materials', accent: 'green', onPress: () => setFilter('all') },
    { key: 'shared', icon: 'book-outline', label: 'Shared with Class', accent: 'purple', onPress: () => setFilter('all') },
    { key: 'library', icon: 'people-outline', label: 'Resource Library', accent: 'orange', onPress: () => navigation.navigate('ResourceLibrary') },
    { key: 'upload', icon: 'cloud-upload-outline', label: 'Upload Material', accent: 'blue', onPress: () => navigation.navigate('UploadMaterial') },
  ];

  const filtered = useMemo(() => {
    return studyMaterials.filter((item) => {
      const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === 'all' || item.type === filter;
      return matchesQuery && matchesFilter;
    });
  }, [query, filter]);

  return (
    <TeacherScreen
      header={<ScreenHeader title="Study Material" trailingIcon="ellipsis-horizontal" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Upload New Material" icon="cloud-upload-outline" onPress={() => navigation.navigate('UploadMaterial')} />}
    >
      {classInfo ? (
        <ClassContextBanner code={classInfo.code} name={classInfo.name} subject={classInfo.subject} room={classInfo.room} studentCount={classInfo.studentCount} />
      ) : null}

      <QuickActionGrid actions={actions} columns={4} />

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search materials…" />
      <FilterChips options={FILTERS} activeKey={filter} onChange={setFilter} />

      <SurfaceCard padded={false} style={styles.listCard}>
        <View style={styles.listHeaderWrap}>
          <SectionHeader title="Recently Added" actionLabel="View All" onAction={() => navigation.navigate('ResourceLibrary')} />
        </View>
        {filtered.map((item, index) => (
          <MaterialRow key={item.id} item={item} divider={index < filtered.length - 1} />
        ))}
      </SurfaceCard>

      <SurfaceCard onPress={() => undefined}>
        <View style={styles.storageRow}>
          <View style={[styles.storageIcon, { backgroundColor: theme.colors.tintTeal }]}>
            <Ionicons name="folder-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.storageInfo}>
            <Text style={[styles.storageTitle, { color: theme.colors.textPrimary }]}>Storage Used</Text>
            <Text style={[styles.storageSub, { color: theme.colors.textSecondary }]}>You&apos;ve used {materialsStorage.usedLabel} of {materialsStorage.totalLabel}</Text>
            <ProgressBar percent={materialsStorage.usedPercent} height={6} />
          </View>
          <View style={styles.storageRight}>
            <Text style={[styles.storagePct, { color: theme.colors.textPrimary }]}>{materialsStorage.usedPercent}%</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
          </View>
        </View>
      </SurfaceCard>

      <InfoBanner tone="tip" text="Organize your materials by topic or chapter for easy access." />
    </TeacherScreen>
  );
}

function MaterialRow({ item, divider }: { item: StudyMaterialItem; divider: boolean }) {
  const theme = useTeacherTheme();
  const meta = TYPE_META[item.type];
  const accent = accentColors(theme.colors, meta.accent);

  return (
    <View style={[styles.materialRow, divider && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={[styles.materialIcon, { backgroundColor: accent.bg }]}>
        <Ionicons name={meta.icon} size={18} color={accent.fg} />
        <Text style={[styles.materialType, { color: accent.fg }]}>{meta.label}</Text>
      </View>
      <View style={styles.materialInfo}>
        <Text style={[styles.materialTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.materialMeta, { color: theme.colors.textSecondary }]}>
          {meta.label} • {item.sizeLabel}
        </Text>
        <Text style={[styles.materialMeta, { color: theme.colors.textSecondary }]}>{item.date} • {item.author}</Text>
      </View>
      <View style={styles.materialRight}>
        {item.sharedWithClass ? <Badge label="Shared with Class" accent="green" icon="people" /> : null}
        <Ionicons name="ellipsis-vertical" size={16} color={theme.colors.textSecondary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  listCard: { paddingHorizontal: 14, paddingVertical: 6 },
  listHeaderWrap: { paddingTop: 10 },
  materialRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  materialIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  materialType: { fontSize: 7, fontWeight: '800', marginTop: 1 },
  materialInfo: { flex: 1, gap: 1 },
  materialTitle: { fontSize: 14, fontWeight: '700' },
  materialMeta: { fontSize: 11 },
  materialRight: { alignItems: 'flex-end', gap: 6 },

  storageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storageIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  storageInfo: { flex: 1, gap: 4 },
  storageTitle: { fontSize: 14, fontWeight: '700' },
  storageSub: { fontSize: 11 },
  storageRight: { alignItems: 'center', gap: 2 },
  storagePct: { fontSize: 13, fontWeight: '700' },
});
