/** Leave Dashboard — balances + recent leave history with quick actions. */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  ListItem,
  StatusPill,
  PrimaryButton,
  InfoBanner,
  ScreenLoader,
  EmptyState,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { accentColors } from '../../../theme/accents';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherHrData } from '../../../hooks/useTeacherHrData';

export default function LeaveDashboardScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { leaveBalances, leaveHistory, status, refetch } = useTeacherHrData();

  useEffect(() => {
    if (status === 'idle') void refetch();
  }, [status, refetch]);

  if (status === 'idle' || status === 'loading') {
    return (
      <TeacherScreen header={<ScreenHeader title="Leave" />}>
        <ScreenLoader message="Loading leave…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Leave"
          trailingIcon="time-outline"
          onTrailingPress={() => navigation.navigate('LeaveHistory')}
        />
      }
      contentStyle={styles.content}
      refreshing={status === 'loading'}
      onRefresh={() => void refetch()}
      footer={
        <PrimaryButton
          label="Apply Leave"
          icon="add-circle-outline"
          variant="gradient"
          onPress={() => navigation.navigate('ApplyLeave', {})}
        />
      }
    >
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Leave Balance</Text>
      {leaveBalances.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No leave balances"
          message="Leave balances will appear once configured by admin."
        />
      ) : (
        <SurfaceCard>
          <View style={styles.balanceRow}>
            {leaveBalances.map((balance) => {
              const accent = accentColors(theme.colors, balance.accent);
              return (
                <View key={balance.id} style={styles.balanceItem}>
                  <View style={[styles.balanceIcon, { backgroundColor: accent.bg }]}>
                    <Text style={[styles.balanceType, { color: accent.fg }]}>{balance.type}</Text>
                  </View>
                  <Text style={[styles.balanceDays, { color: theme.colors.textPrimary }]}>
                    {balance.daysLeft}
                  </Text>
                  <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
                    days left
                  </Text>
                </View>
              );
            })}
          </View>
        </SurfaceCard>
      )}

      <SectionHeader
        title="Recent Requests"
        actionLabel="View All"
        onAction={() => navigation.navigate('LeaveHistory')}
      />
      {leaveHistory.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No leave requests"
          message="Apply for leave to see your requests here."
        />
      ) : (
        <SurfaceCard padded={false} style={styles.card}>
          {leaveHistory.slice(0, 3).map((record, index) => (
            <ListItem
              key={record.id}
              leadingLabel={record.type}
              iconAccent={leaveBalances.find((b) => b.type === record.type)?.accent ?? 'teal'}
              title={record.typeLabel}
              subtitle={record.dateRange}
              divider={index < Math.min(2, leaveHistory.length - 1)}
              trailing={
                <StatusPill
                  status={
                    record.status === 'cancelled'
                      ? 'cancelled'
                      : (record.status as 'approved' | 'pending' | 'rejected')
                  }
                />
              }
            />
          ))}
        </SurfaceCard>
      )}

      <InfoBanner text="Leave requests are subject to approval from the administrator." />
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceItem: { flex: 1, alignItems: 'center', gap: 4 },
  balanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceType: { fontSize: 12, fontWeight: '800' },
  balanceDays: { fontSize: 18, fontWeight: '800' },
  balanceLabel: { fontSize: 10 },
  card: { paddingHorizontal: 14 },
});
