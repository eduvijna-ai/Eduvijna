/**
 * School Overview — full institutional report: KPIs, attendance trend +
 * distribution, subject performance, grade-wise marks and infrastructure.
 * Reference: assets/admin_screens/admin school overview screen.png
 */

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
import { DistributionList, DonutLegend, OpsList } from '../components';

export default function SchoolOverviewScreen() {
  const theme = useTeacherTheme();
  const { school } = useAdminData();

  return (
    <TeacherScreen header={<ScreenHeader title="School Overview" />} contentStyle={styles.content}>
      <StatGrid items={school.kpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Attendance Trend" />
        <BarChart data={school.attendanceTrend.map((p) => ({ label: p.label, value: p.value }))} barColor={theme.colors.primary} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Today's Attendance" />
        <DonutLegend rows={school.attendanceDistribution} centerValue="93%" centerLabel="Present" />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Subject Performance" />
        <DistributionList rows={school.subjectPerformance} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Grade-wise Average Marks" />
        <BarChart data={school.gradeMarks.map((p) => ({ label: p.label, value: p.value }))} />
      </SurfaceCard>

      <SectionHeader title="Infrastructure" />
      <SurfaceCard padded={false} style={styles.listCard}>
        <OpsList rows={school.infrastructure} />
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  listCard: { paddingHorizontal: 14 },
});
