/** Salary History — list of past payslips. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  ListItem,
  StatusPill,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { salaryHistory } from '../../../data';

const formatINR = (value: number): string => `₹${value.toLocaleString('en-IN')}`;

export default function SalaryHistoryScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();

  return (
    <TeacherScreen header={<ScreenHeader title="Salary History" trailingIcon="filter-outline" />} contentStyle={styles.content}>
      <SurfaceCard padded={false} style={styles.card}>
        {salaryHistory.map((slip, index) => (
          <ListItem
            key={slip.id}
            icon="calendar-clear-outline"
            iconAccent="green"
            title={slip.monthLabel}
            subtitle={slip.paidOn}
            divider={index < salaryHistory.length - 1}
            showChevron
            onPress={() => navigation.navigate('PayslipDetails', { payslipId: slip.id })}
            trailing={
              <View style={styles.right}>
                <Text style={[styles.amount, { color: theme.colors.textPrimary }]}>{formatINR(slip.netSalary)}</Text>
                <StatusPill status="paid" showIcon={false} />
              </View>
            }
          />
        ))}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4 },
  card: { paddingHorizontal: 14 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '700' },
});
