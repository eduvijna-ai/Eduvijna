/** Staff Management — staff KPIs + searchable staff directory. */

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

export default function StaffManagementScreen() {
  const { staff } = useAdminData();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => staff.directory.filter((s) => `${s.name} ${s.subtitle}`.toLowerCase().includes(query.toLowerCase())),
    [staff.directory, query],
  );

  return (
    <TeacherScreen header={<ScreenHeader title="Staff Management" />} contentStyle={styles.content}>
      <StatGrid items={staff.kpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Staff Directory" />
        <View style={styles.searchWrap}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search staff…" />
        </View>
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <EmptyState icon="briefcase-outline" title="No staff found" message="Try a different search." />
          ) : (
            filtered.map((s, index) => (
              <ListItem
                key={s.id}
                avatarName={s.name}
                title={s.name}
                subtitle={`${s.subtitle} • ${s.meta}`}
                divider={index < filtered.length - 1}
                trailing={<PersonStatusBadge status={s.status} label={s.value} />}
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
