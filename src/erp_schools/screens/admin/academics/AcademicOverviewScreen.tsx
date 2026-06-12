/**
 * Academic Overview — KPIs, performance trend, grade-wise marks, subject
 * performance, distribution donut, top classes & recent reports.
 * Reference: assets/admin_screens/admin academic overview screen.png
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
  ListItem,
  Badge,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useAdminData } from '../../../hooks/useAdminData';
import { DistributionList, DonutLegend, RankedList } from '../components';

export default function AcademicOverviewScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const { academics, reports } = useAdminData();

  return (
    <TeacherScreen header={<ScreenHeader title="Academic Overview" />} contentStyle={styles.content}>
      <StatGrid items={academics.kpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Performance Trend" />
        <BarChart data={academics.trend.map((p) => ({ label: p.label, value: p.value }))} barColor={theme.colors.primary} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Grade Wise Average Marks" />
        <BarChart data={academics.gradeMarks.map((p) => ({ label: p.label, value: p.value }))} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Subject Performance" />
        <DistributionList rows={academics.subjectPerformance} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Assessment Distribution" />
        <DonutLegend rows={academics.distribution} centerValue="2,453" centerLabel="Total" />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Top Performing Classes" actionLabel="View All" onAction={() => undefined} />
        <RankedList rows={academics.topClasses} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Recently Generated" actionLabel="View All" onAction={() => navigation.navigate('AcademicReports')} />
        {reports.recent.slice(0, 3).map((report, index) => (
          <ListItem
            key={report.id}
            icon={report.icon}
            iconAccent={report.accent}
            title={report.title}
            subtitle={`${report.description} • ${report.dateLabel}`}
            divider={index < 2}
            trailing={<Badge label={report.fileType} accent={report.fileType === 'PDF' ? 'red' : 'green'} />}
            onPress={() => navigation.navigate('AcademicReports')}
          />
        ))}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
});
