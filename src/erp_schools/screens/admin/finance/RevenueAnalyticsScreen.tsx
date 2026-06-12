/** Revenue Analytics — revenue KPIs, monthly trend & revenue-source breakdown. */

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

export default function RevenueAnalyticsScreen() {
  const theme = useTeacherTheme();
  const { finance } = useAdminData();

  return (
    <TeacherScreen header={<ScreenHeader title="Revenue Analytics" />} contentStyle={styles.content}>
      <StatGrid items={finance.revenueKpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Revenue Trend (₹ Lakhs)" />
        <BarChart data={finance.revenueTrend.map((p) => ({ label: p.label, value: p.value }))} barColor={theme.colors.success} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Revenue Sources" />
        <DonutLegend rows={finance.revenueSources} centerValue="₹15.6L" centerLabel="Total" />
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
});
