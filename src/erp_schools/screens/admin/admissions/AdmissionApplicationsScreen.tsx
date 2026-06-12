/** Admission Applications — searchable, filterable list of applicants. */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SearchBar,
  FilterChips,
  ListItem,
  Badge,
  EmptyState,
  type ChipOption,
} from '../../../components';
import { useAdminData } from '../../../hooks/useAdminData';
import { admissionStatusMeta } from '../adminVisuals';
import type { ApplicationStatus } from '../../../types/admin';

const FILTERS: ChipOption[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'review', label: 'In Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'waitlist', label: 'Waitlist' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AdmissionApplicationsScreen() {
  const { admissions } = useAdminData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(
    () =>
      admissions.applications.filter((app) => {
        const matchesQuery = `${app.applicantName} ${app.grade} ${app.guardian}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesFilter = filter === 'all' || app.status === (filter as ApplicationStatus);
        return matchesQuery && matchesFilter;
      }),
    [admissions.applications, query, filter],
  );

  return (
    <TeacherScreen header={<ScreenHeader title="Applications" />} contentStyle={styles.content}>
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search applicants…" />
      </View>
      <FilterChips options={FILTERS} activeKey={filter} onChange={setFilter} />

      <SurfaceCard padded={false} style={styles.card}>
        {filtered.length === 0 ? (
          <EmptyState icon="document-text-outline" title="No applications" message="Try a different search or filter." />
        ) : (
          filtered.map((app, index) => {
            const meta = admissionStatusMeta(app.status);
            return (
              <ListItem
                key={app.id}
                avatarName={app.applicantName}
                title={app.applicantName}
                subtitle={`${app.grade} • Guardian: ${app.guardian} • ${app.appliedOn}`}
                divider={index < filtered.length - 1}
                trailing={<Badge label={meta.label} accent={meta.accent} />}
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
  searchWrap: { flexDirection: 'row' },
  card: { paddingHorizontal: 14, marginTop: 4 },
});
