/** Route Management — searchable route list with stops, distance & ridership. */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SearchBar,
  EmptyState,
  PrimaryButton,
} from '../../../components';
import { useAdminData } from '../../../hooks/useAdminData';
import { OpsList } from '../components';

export default function RouteManagementScreen() {
  const { operations } = useAdminData();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => operations.routes.filter((r) => `${r.title} ${r.subtitle}`.toLowerCase().includes(query.toLowerCase())),
    [operations.routes, query],
  );

  return (
    <TeacherScreen
      header={<ScreenHeader title="Routes" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Add Route" icon="add" onPress={() => undefined} />}
    >
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search routes…" />
      </View>
      <SurfaceCard padded={false} style={styles.card}>
        {filtered.length === 0 ? (
          <EmptyState icon="map-outline" title="No routes found" message="Try a different search." />
        ) : (
          <OpsList rows={filtered} />
        )}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  searchWrap: { flexDirection: 'row' },
  card: { paddingHorizontal: 14 },
});
