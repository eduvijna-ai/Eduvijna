/**
 * Reports Dashboard — report analytics, browseable report categories and the
 * recently-generated feed. Reference: assets/admin_screens/admin reports screen.png
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  ListItem,
  Badge,
} from '../../../components';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useAdminData } from '../../../hooks/useAdminData';

export default function ReportsDashboardScreen() {
  const navigation = useAdminNavigation();
  const { reports } = useAdminData();

  return (
    <TeacherScreen header={<ScreenHeader title="Reports" />} contentStyle={styles.content}>
      <StatGrid items={reports.analyticsKpis} columns={2} variant="tinted" />

      <SectionHeader title="Report Categories" />
      <SurfaceCard padded={false} style={styles.card}>
        {reports.categories.map((category, index) => (
          <ListItem
            key={category.id}
            icon={category.icon}
            iconAccent={category.accent}
            title={category.title}
            subtitle={category.description}
            divider={index < reports.categories.length - 1}
            showChevron
            onPress={() =>
              category.title === 'Academics' ? navigation.navigate('AcademicReports') : undefined
            }
            trailing={<Badge label={`${category.count}`} accent={category.accent} />}
          />
        ))}
      </SurfaceCard>

      <SectionHeader title="Recently Generated" />
      <SurfaceCard padded={false} style={styles.card}>
        {reports.recent.map((report, index) => (
          <ListItem
            key={report.id}
            icon={report.icon}
            iconAccent={report.accent}
            title={report.title}
            subtitle={`${report.description} • ${report.dateLabel}`}
            divider={index < reports.recent.length - 1}
            trailing={<Badge label={report.fileType} accent={report.fileType === 'PDF' ? 'red' : 'green'} />}
          />
        ))}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  card: { paddingHorizontal: 14 },
});
