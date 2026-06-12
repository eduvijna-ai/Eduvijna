/** Expense Analytics — expense KPIs, monthly trend & expense-category breakdown. */

import React from 'react';
import { StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  BarChart,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminData } from '../../../hooks/useAdminData';
import { DonutLegend } from '../components';

export default function ExpenseAnalyticsScreen() {
  const theme = useTeacherTheme();
  const { finance } = useAdminData();

  return (
    <TeacherScreen header={<ScreenHeader title="Expense Analytics" />} contentStyle={styles.content}>
      <StatGrid items={finance.expenseKpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Expense Trend (₹ Lakhs)" />
        <BarChart data={finance.expenseTrend.map((p) => ({ label: p.label, value: p.value }))} barColor={theme.colors.danger} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Expense Categories" />
        <DonutLegend rows={finance.expenseCategories} centerValue="₹9.8L" centerLabel="Total" />
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
});
