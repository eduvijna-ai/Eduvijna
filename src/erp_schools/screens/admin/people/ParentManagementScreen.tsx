/** Parent Management — engagement KPIs + searchable parent directory. */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  SearchBar,
  ListItem,
  EmptyState,
} from '../../../components';
import { useAdminData } from '../../../hooks/useAdminData';
import { PersonStatusBadge } from '../components';

export default function ParentManagementScreen() {
  const { parents } = useAdminData();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => parents.directory.filter((p) => `${p.name} ${p.subtitle}`.toLowerCase().includes(query.toLowerCase())),
    [parents.directory, query],
  );

  return (
    <TeacherScreen header={<ScreenHeader title="Parent Management" />} contentStyle={styles.content}>
      <StatGrid items={parents.kpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Parent Directory" />
        <View style={styles.searchWrap}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search parents…" />
        </View>
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <EmptyState icon="people-circle-outline" title="No parents found" message="Try a different search." />
          ) : (
            filtered.map((p, index) => (
              <ListItem
                key={p.id}
                avatarName={p.name}
                title={p.name}
                subtitle={`${p.subtitle} • ${p.meta}`}
                divider={index < filtered.length - 1}
                trailing={<PersonStatusBadge status={p.status} label={p.value} />}
              />
            ))
          )}
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  searchWrap: { flexDirection: 'row', marginBottom: 8 },
  list: { marginTop: 4 },
});
