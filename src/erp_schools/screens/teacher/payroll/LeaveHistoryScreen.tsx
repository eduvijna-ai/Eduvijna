/** Leave History — full list of leave requests with status. */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  ListItem,
  StatusPill,
  FilterChips,
  type ChipOption,
  type PillStatus,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { leaveBalances, leaveHistory } from '../../../data';

const FILTERS: ChipOption[] = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
];

export default function LeaveHistoryScreen() {
  const theme = useTeacherTheme();
  const [filter, setFilter] = useState('all');

  const records = filter === 'all' ? leaveHistory : leaveHistory.filter((r) => r.status === filter);

  return (
    <TeacherScreen header={<ScreenHeader title="Leave History" />} contentStyle={styles.content}>
      <FilterChips options={FILTERS} activeKey={filter} onChange={setFilter} />

      <SurfaceCard padded={false} style={styles.card}>
        {records.map((record, index) => (
          <ListItem
            key={record.id}
            leadingLabel={record.type}
            iconAccent={leaveBalances.find((b) => b.type === record.type)?.accent ?? 'teal'}
            title={record.typeLabel}
            subtitle={record.dateRange}
            divider={index < records.length - 1}
            trailing={
              <View style={styles.right}>
                <StatusPill status={record.status as PillStatus} />
                <Text style={[styles.decision, { color: theme.colors.textSecondary }]}>{record.decisionLabel}</Text>
              </View>
            }
          />
        ))}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  card: { paddingHorizontal: 14 },
  right: { alignItems: 'flex-end', gap: 4, maxWidth: 130 },
  decision: { fontSize: 10, textAlign: 'right' },
});
