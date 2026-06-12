/** Book Management — catalog KPIs + searchable book catalog. */

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

export default function BookManagementScreen() {
  const { operations } = useAdminData();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => operations.bookCatalog.filter((b) => `${b.title} ${b.subtitle}`.toLowerCase().includes(query.toLowerCase())),
    [operations.bookCatalog, query],
  );

  return (
    <TeacherScreen
      header={<ScreenHeader title="Book Management" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Add Book" icon="add" onPress={() => undefined} />}
    >
      <StatGrid items={operations.bookKpis} columns={2} variant="tinted" />

      <SectionHeader title="Catalog" />
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search books…" />
      </View>
      <SurfaceCard padded={false} style={styles.card}>
        {filtered.length === 0 ? (
          <EmptyState icon="book-outline" title="No books found" message="Try a different search." />
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
