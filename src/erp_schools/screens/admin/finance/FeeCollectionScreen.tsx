/**
 * Fee Collection — collection KPIs, fee-type breakdown, concessions and a
 * searchable/filterable student fee-record list (cards, not a desktop table).
 * Reference: assets/admin_screens/admin fee management screen.png
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  SearchBar,
  FilterChips,
  ListItem,
  Badge,
  EmptyState,
  PrimaryButton,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminData } from '../../../hooks/useAdminData';
import { DistributionList } from '../components';
import { feeStatusMeta } from '../adminVisuals';
import { accentColors } from '../../../theme/accents';
import type { FeeRecordStatus } from '../../../types/admin';

const FILTERS: ChipOption[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending' },
  { key: 'overdue', label: 'Overdue' },
];

const currency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export default function FeeCollectionScreen() {
  const theme = useTeacherTheme();
  const { finance } = useAdminData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(
    () =>
      finance.records.filter((record) => {
        const matchesQuery = `${record.studentName} ${record.studentId} ${record.grade}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesFilter = filter === 'all' || record.status === (filter as FeeRecordStatus);
        return matchesQuery && matchesFilter;
      }),
    [finance.records, query, filter],
  );

  return (
    <TeacherScreen
      header={<ScreenHeader title="Fee Collection" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Collect Fee" icon="cash-outline" onPress={() => undefined} />}
    >
      <StatGrid items={finance.feeCollectionKpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Fee Type Breakdown" />
        {finance.feeTypes.map((feeType, index) => {
          const accent = accentColors(theme.colors, feeType.accent);
          return (
            <View
              key={feeType.id}
              style={[
                styles.feeTypeRow,
                index < finance.feeTypes.length - 1 && {
                  borderBottomColor: theme.colors.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={[styles.feeIcon, { backgroundColor: accent.bg }]}>
                <Ionicons name={feeType.icon} size={18} color={accent.fg} />
              </View>
              <Text style={[styles.feeLabel, { color: theme.colors.textPrimary }]}>{feeType.label}</Text>
              <View style={styles.feeRight}>
                <Text style={[styles.feeAmount, { color: theme.colors.textPrimary }]}>{feeType.amountLabel}</Text>
                <Text style={[styles.feePercent, { color: theme.colors.textSecondary }]}>{feeType.percentLabel}</Text>
              </View>
            </View>
          );
        })}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Concessions" />
        <DistributionList rows={finance.concessions} />
      </SurfaceCard>

      <SectionHeader title="Student Fee Records" />
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search students…" />
      </View>
      <FilterChips options={FILTERS} activeKey={filter} onChange={setFilter} />
      <SurfaceCard padded={false} style={styles.card}>
        {filtered.length === 0 ? (
          <EmptyState icon="wallet-outline" title="No records found" message="Try a different search or filter." />
        ) : (
          filtered.map((record, index) => {
            const meta = feeStatusMeta(record.status);
            return (
              <ListItem
                key={record.id}
                avatarName={record.studentName}
                title={record.studentName}
                subtitle={`${record.studentId} • ${record.grade} • ${record.dueLabel}`}
                divider={index < filtered.length - 1}
                trailing={
                  <View style={styles.recordTrailing}>
                    <Text style={[styles.recordAmount, { color: theme.colors.textPrimary }]}>{currency(record.amount)}</Text>
                    <Badge label={meta.label} accent={meta.accent} />
                  </View>
                }
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
  feeTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  feeIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  feeLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  feeRight: { alignItems: 'flex-end' },
  feeAmount: { fontSize: 14, fontWeight: '700' },
  feePercent: { fontSize: 12 },
  searchWrap: { flexDirection: 'row' },
  card: { paddingHorizontal: 14, marginTop: 4 },
  recordTrailing: { alignItems: 'flex-end', gap: 4 },
  recordAmount: { fontSize: 13, fontWeight: '700' },
});
