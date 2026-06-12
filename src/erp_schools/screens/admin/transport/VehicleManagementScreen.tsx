/** Vehicle Management — fleet KPIs + searchable vehicle list. */

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

export default function VehicleManagementScreen() {
  const { operations } = useAdminData();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => operations.vehicles.filter((v) => `${v.title} ${v.subtitle}`.toLowerCase().includes(query.toLowerCase())),
    [operations.vehicles, query],
  );

  return (
    <TeacherScreen
      header={<ScreenHeader title="Vehicles" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Add Vehicle" icon="add" onPress={() => undefined} />}
    >
      <StatGrid items={operations.vehicleKpis} columns={2} variant="tinted" />

      <SectionHeader title="Fleet" />
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search vehicles…" />
      </View>
      <SurfaceCard padded={false} style={styles.card}>
        {filtered.length === 0 ? (
          <EmptyState icon="bus-outline" title="No vehicles found" message="Try a different search." />
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
