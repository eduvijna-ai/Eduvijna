/**
 * Leave History — web My Leave list parity (status filters, edit, deactivate).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  ListItem,
  StatusPill,
  FilterChips,
  EmptyState,
  ScreenLoader,
  type ChipOption,
  type PillStatus,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherHrData } from '../../../hooks/useTeacherHrData';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import type { LeaveRecord } from '../../../types/domain';

const FILTERS: ChipOption[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
];

function pillFor(status: LeaveRecord['status']): PillStatus {
  if (status === 'cancelled') return 'cancelled';
  return status;
}

export default function LeaveHistoryScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const [filter, setFilter] = useState('all');
  const {
    leaveBalances,
    leaveHistory,
    status,
    error,
    refetch,
    deactivateLeave,
    saving,
  } = useTeacherHrData();

  const records =
    filter === 'all' ? leaveHistory : leaveHistory.filter((r) => r.status === filter);

  const openActions = (record: LeaveRecord) => {
    const doEdit = () =>
      navigation.navigate('ApplyLeave', { leaveId: record.leaveId });
    const doDeactivate = () => {
      Alert.alert('Deactivate leave?', 'This will deactivate the leave request.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            void deactivateLeave(record.leaveId).then((ok) => {
              if (!ok) Alert.alert('Failed', 'Could not deactivate leave.');
            });
          },
        },
      ]);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit', 'Deactivate'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (i) => {
          if (i === 1) doEdit();
          if (i === 2) doDeactivate();
        },
      );
    } else {
      Alert.alert(record.typeLabel, undefined, [
        { text: 'Edit', onPress: doEdit },
        { text: 'Deactivate', style: 'destructive', onPress: doDeactivate },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  if (status === 'idle' || status === 'loading') {
    return (
      <TeacherScreen header={<ScreenHeader title="Leave History" />}>
        <ScreenLoader message="Loading leave history…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Leave History"
          trailingIcon="add"
          onTrailingPress={() => navigation.navigate('ApplyLeave', {})}
        />
      }
      contentStyle={styles.content}
      refreshing={status === 'loading' || saving}
      onRefresh={() => void refetch()}
    >
      <FilterChips options={FILTERS} activeKey={filter} onChange={setFilter} />

      {error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text>
      ) : null}

      <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
        {records.length} leave request{records.length === 1 ? '' : 's'}
      </Text>

      {records.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No leave requests"
          message="Apply for leave to see it here."
          ctaLabel="Apply Leave"
          onCtaPress={() => navigation.navigate('ApplyLeave', {})}
        />
      ) : (
        <SurfaceCard padded={false} style={styles.card}>
          {records.map((record, index) => (
            <ListItem
              key={record.id}
              leadingLabel={record.type}
              iconAccent={
                leaveBalances.find((b) => b.type === record.type)?.accent ?? 'teal'
              }
              title={record.typeLabel}
              subtitle={`${record.dateRange}${
                record.halfDay
                  ? ` · Half day (${record.halfDay === 'first' ? '1st' : '2nd'})`
                  : ''
              }`}
              divider={index < records.length - 1}
              onPress={() => openActions(record)}
              trailing={
                <View style={styles.right}>
                  <StatusPill status={pillFor(record.status)} />
                  <Text style={[styles.decision, { color: theme.colors.textSecondary }]}>
                    {record.decisionLabel || record.status}
                  </Text>
                  <TouchableOpacity
                    onPress={() => openActions(record)}
                    hitSlop={10}
                    style={styles.moreBtn}
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={14}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              }
            />
          ))}
        </SurfaceCard>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  count: { fontSize: 12, fontWeight: '600' },
  card: { paddingHorizontal: 14 },
  right: { alignItems: 'flex-end', gap: 4, maxWidth: 140 },
  decision: { fontSize: 10, textAlign: 'right' },
  moreBtn: { paddingTop: 2 },
});
