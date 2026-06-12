/**
 * Student Management — analytics, enrollment, grade distribution, at-risk,
 * recent admissions and a searchable student directory.
 * Reference: assets/admin_screens/admin student overview screen.png
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  BarChart,
  SearchBar,
  ListItem,
  Badge,
  InfoBanner,
  EmptyState,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminData } from '../../../hooks/useAdminData';
import { DonutLegend } from '../components';

export default function StudentManagementScreen() {
  const theme = useTeacherTheme();
  const { students } = useAdminData();
  const [query, setQuery] = useState('');

  const filteredAdmissions = useMemo(
    () => students.recentAdmissions.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
    [students.recentAdmissions, query],
  );

  return (
    <TeacherScreen header={<ScreenHeader title="Student Management" />} contentStyle={styles.content}>
      <StatGrid items={students.kpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Enrollment Trend" />
        <BarChart data={students.enrollmentTrend.map((p) => ({ label: p.label, value: p.value }))} barColor={theme.colors.primary} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Students by Grade" />
        <DonutLegend rows={students.byGrade} centerValue="2,458" centerLabel="Total" />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Students at Risk" actionLabel="View All" onAction={() => undefined} />
        {students.atRisk.map((row, index) => (
          <ListItem
            key={row.id}
            icon="warning-outline"
            iconAccent={row.accent}
            title={row.name}
            subtitle={`${row.subtitle} • ${row.meta}`}
            divider={index < students.atRisk.length - 1}
            trailing={<Badge label={row.value} accent={row.accent} />}
          />
        ))}
      </SurfaceCard>

      <InfoBanner
        tone="tip"
        title="AI Student Insights"
        text="312 students are at academic or attendance risk. Grade 7-A performance dropped by 8%."
      />

      <SurfaceCard>
        <SectionHeader title="Recent Admissions" />
        <View style={styles.searchWrap}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search admissions…" />
        </View>
        {filteredAdmissions.length === 0 ? (
          <EmptyState icon="people-outline" title="No students found" message="Try a different search." />
        ) : (
          filteredAdmissions.map((row, index) => (
            <ListItem
              key={row.id}
              avatarName={row.name}
              title={row.name}
              subtitle={`${row.subtitle} • ${row.meta}`}
              divider={index < filteredAdmissions.length - 1}
              trailing={<Badge label={row.value} accent="green" />}
            />
          ))
        )}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  searchWrap: { flexDirection: 'row', marginBottom: 4 },
});
