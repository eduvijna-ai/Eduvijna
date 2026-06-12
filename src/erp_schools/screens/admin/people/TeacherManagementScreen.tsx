/**
 * Teacher Management — staff analytics, attendance, performance distribution &
 * by-criteria, teachers on leave, and a searchable/filterable directory (cards,
 * not a table). Reference: assets/admin_screens/admin teacher overview screen.png
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  SearchBar,
  FilterChips,
  ListItem,
  EmptyState,
  type ChipOption,
} from '../../../components';
import { useAdminData } from '../../../hooks/useAdminData';
import { DonutLegend, CriteriaList, PersonStatusBadge } from '../components';

const FILTERS: ChipOption[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'absent', label: 'Absent' },
  { key: 'leave', label: 'On Leave' },
];

export default function TeacherManagementScreen() {
  const { teachers } = useAdminData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(
    () =>
      teachers.directory.filter((t) => {
        const matchesQuery = `${t.name} ${t.subtitle}`.toLowerCase().includes(query.toLowerCase());
        const matchesFilter = filter === 'all' || t.status === filter;
        return matchesQuery && matchesFilter;
      }),
    [teachers.directory, query, filter],
  );

  return (
    <TeacherScreen header={<ScreenHeader title="Teacher Management" />} contentStyle={styles.content}>
      <StatGrid items={teachers.kpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Performance Distribution" />
        <DonutLegend rows={teachers.performanceDistribution} centerValue="126" centerLabel="Total" />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Performance by Criteria" />
        <CriteriaList rows={teachers.performanceCriteria} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Teachers on Leave" actionLabel="View All" onAction={() => undefined} />
        {teachers.onLeave.map((t, index) => (
          <ListItem
            key={t.id}
            avatarName={t.name}
            title={t.name}
            subtitle={`${t.subtitle} • ${t.meta}`}
            divider={index < teachers.onLeave.length - 1}
            trailing={<PersonStatusBadge status={t.status} label={t.value} />}
          />
        ))}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Teacher Directory" />
        <View style={styles.searchWrap}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search teachers…" />
        </View>
        <FilterChips options={FILTERS} activeKey={filter} onChange={setFilter} />
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <EmptyState icon="people-outline" title="No teachers found" message="Try a different search or filter." />
          ) : (
            filtered.map((t, index) => (
              <ListItem
                key={t.id}
                avatarName={t.name}
                title={t.name}
                subtitle={`${t.subtitle} • ${t.meta} • ${t.value}`}
                divider={index < filtered.length - 1}
                trailing={<PersonStatusBadge status={t.status} />}
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
  list: { marginTop: 8 },
});
