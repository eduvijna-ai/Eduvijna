/** Resource Library — school-shared resources, searchable. */

import React, { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SearchBar,
  ListItem,
  Badge,
  EmptyState,
} from '../../../components';
import type { AccentKey } from '../../../theme/accents';
import { resourceLibrary } from '../../../data';
import type { MaterialType } from '../../../types/domain';

const TYPE_META: Record<MaterialType, { accent: AccentKey; icon: 'document-text' | 'easel' | 'document' | 'videocam' | 'link' | 'folder' }> = {
  pdf: { accent: 'green', icon: 'document-text' },
  ppt: { accent: 'purple', icon: 'easel' },
  doc: { accent: 'orange', icon: 'document' },
  video: { accent: 'blue', icon: 'videocam' },
  link: { accent: 'purple', icon: 'link' },
  other: { accent: 'teal', icon: 'folder' },
};

export default function ResourceLibraryScreen() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => resourceLibrary.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <TeacherScreen header={<ScreenHeader title="Resource Library" />} contentStyle={styles.content}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search resources…" />
      <SurfaceCard padded={false} style={styles.card}>
        {filtered.length === 0 ? (
          <EmptyState icon="library-outline" title="No resources found" />
        ) : (
          filtered.map((item, index) => {
            const meta = TYPE_META[item.type];
            return (
              <ListItem
                key={item.id}
                icon={meta.icon}
                iconAccent={meta.accent}
                title={item.title}
                subtitle={`${item.sizeLabel} • ${item.date} • ${item.author}`}
                divider={index < filtered.length - 1}
                showChevron
                trailing={<Badge label="School" accent="teal" />}
              />
            );
          })
        )}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  card: { paddingHorizontal: 14 },
});
