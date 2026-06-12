/**
 * Attendance Dashboard — school-wide attendance analytics: KPIs, trend,
 * distribution, class-wise ranking, alerts, teacher summary & today's absentees.
 * Reference: assets/admin_screens/admin school attandance screen.png
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
  InfoBanner,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminData } from '../../../hooks/useAdminData';
import { DonutLegend, RankedList, OpsList, PersonStatusBadge } from '../components';

export default function AttendanceDashboardScreen() {
  const theme = useTeacherTheme();
  const { attendance } = useAdminData();

  return (
    <TeacherScreen header={<ScreenHeader title="Attendance" />} contentStyle={styles.content}>
      <StatGrid items={attendance.kpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Attendance Trend" />
        <BarChart data={attendance.trend.map((p) => ({ label: p.label, value: p.value }))} barColor={theme.colors.primary} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Today's Distribution" />
        <DonutLegend rows={attendance.distribution} centerValue="93%" centerLabel="Present" />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Class-wise Attendance" />
        <RankedList rows={attendance.classWise} />
      </SurfaceCard>

      <InfoBanner
        tone="tip"
        icon="warning-outline"
        title="Attendance Alerts"
        text="Grade 7-A dropped 8% and Grade 6-C dropped 12%. 10 students are below the 75% threshold."
      />

      <SurfaceCard padded={false} style={styles.card}>
        <OpsList rows={attendance.alerts} />
      </SurfaceCard>

      <SectionHeader title="Teacher Attendance" />
      <SurfaceCard padded={false} style={styles.card}>
        {attendance.teacherSummary.map((teacher, index) => (
          <ListItem
            key={teacher.id}
            avatarName={teacher.name}
            title={teacher.name}
            subtitle={teacher.subtitle}
            divider={index < attendance.teacherSummary.length - 1}
            trailing={<PersonStatusBadge status={teacher.status} label={teacher.value} />}
          />
        ))}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  card: { paddingHorizontal: 14 },
});
