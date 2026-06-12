/** Inventory Dashboard — stock KPIs + searchable inventory item list. */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  SearchBar,
  EmptyState,
  PrimaryButton,
} from '../../../components';
import { useAdminData } from '../../../hooks/useAdminData';
import { OpsList } from '../components';

export default function InventoryDashboardScreen() {
  const { operations } = useAdminData();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => operations.inventoryItems.filter((i) => `${i.title} ${i.subtitle}`.toLowerCase().includes(query.toLowerCase())),
    [operations.inventoryItems, query],
  );

  return (
    <TeacherScreen
      header={<ScreenHeader title="Inventory" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Add Item" icon="add" onPress={() => undefined} />}
    >
      <StatGrid items={operations.inventoryKpis} columns={2} variant="tinted" />

      <SectionHeader title="Items" />
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search items…" />
      </View>
      <SurfaceCard padded={false} style={styles.card}>
        {filtered.length === 0 ? (
          <EmptyState icon="cube-outline" title="No items found" message="Try a different search." />
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
  card: { paddingHorizontal: 14, marginTop: 4 },
});
