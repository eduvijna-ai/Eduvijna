/**
 * Academic Reports — report catalog, KPIs, quick access & recently generated.
 * Reference: assets/admin_screens/admin academic reports screen.png
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  QuickActionGrid,
  ListItem,
  Badge,
  type QuickAction,
} from '../../../components';
import { useAdminData } from '../../../hooks/useAdminData';

export default function AcademicReportsScreen() {
  const { reports } = useAdminData();

  const quickAccess: QuickAction[] = [
    { key: 'class', icon: 'bar-chart-outline', label: 'Class', accent: 'green', onPress: () => undefined },
    { key: 'subject', icon: 'book-outline', label: 'Subject', accent: 'blue', onPress: () => undefined },
    { key: 'assess', icon: 'clipboard-outline', label: 'Assessment', accent: 'purple', onPress: () => undefined },
    { key: 'outcomes', icon: 'school-outline', label: 'Outcomes', accent: 'orange', onPress: () => undefined },
    { key: 'grade', icon: 'ribbon-outline', label: 'Grade', accent: 'teal', onPress: () => undefined },
  ];

  return (
    <TeacherScreen header={<ScreenHeader title="Academic Reports" />} contentStyle={styles.content}>
      <StatGrid items={reports.kpis} columns={4} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Quick Access" />
        <QuickActionGrid actions={quickAccess} columns={5} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Academic Reports" />
        {reports.academicReports.map((report, index) => (
          <ListItem
            key={report.id}
            icon={report.icon}
            iconAccent={report.accent}
            title={report.title}
            subtitle={report.description}
            divider={index < reports.academicReports.length - 1}
            showChevron
            onPress={() => undefined}
            trailing={<Badge label={report.fileType} accent={report.fileType === 'PDF' ? 'red' : 'green'} />}
          />
        ))}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Recently Generated" actionLabel="View All" onAction={() => undefined} />
        {reports.recent.slice(0, 3).map((report, index) => (
          <ListItem
            key={report.id}
            icon={report.icon}
            iconAccent={report.accent}
            title={report.title}
            subtitle={`${report.description} • ${report.dateLabel}`}
            divider={index < 2}
            trailing={<Badge label={report.fileType} accent={report.fileType === 'PDF' ? 'red' : 'green'} />}
          />
        ))}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
});
