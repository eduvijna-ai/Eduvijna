/**
 * Admissions Dashboard — KPIs, application trend, grade-wise demand, and quick
 * links into applications & approval workflow.
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
import { DistributionList } from '../components';
import { admissionStatusMeta } from '../adminVisuals';

export default function AdmissionsDashboardScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const { admissions } = useAdminData();

  return (
    <TeacherScreen header={<ScreenHeader title="Admissions" />} contentStyle={styles.content}>
      <StatGrid items={admissions.kpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Applications Trend" />
        <BarChart data={admissions.trend.map((p) => ({ label: p.label, value: p.value }))} barColor={theme.colors.primary} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Applications by Grade" />
        <DistributionList rows={admissions.byGrade} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Recent Applications" actionLabel="View All" onAction={() => navigation.navigate('AdmissionApplications')} />
        {admissions.applications.slice(0, 4).map((app, index) => {
          const meta = admissionStatusMeta(app.status);
          return (
            <ListItem
              key={app.id}
              avatarName={app.applicantName}
              title={app.applicantName}
              subtitle={`${app.grade} • ${app.appliedOn}`}
              divider={index < 3}
              trailing={<Badge label={meta.label} accent={meta.accent} />}
            />
          );
        })}
      </SurfaceCard>

      <SurfaceCard padded={false} style={styles.linkCard}>
        <ListItem
          icon="document-text-outline"
          iconAccent="teal"
          title="All Applications"
          subtitle="Review & process applications"
          showChevron
          onPress={() => navigation.navigate('AdmissionApplications')}
        />
        <ListItem
          icon="git-branch-outline"
          iconAccent="purple"
          title="Approval Workflow"
          subtitle="Pending approvals & requests"
          divider={false}
          showChevron
          onPress={() => navigation.navigate('ApprovalWorkflow')}
        />
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  linkCard: { paddingHorizontal: 14 },
});
