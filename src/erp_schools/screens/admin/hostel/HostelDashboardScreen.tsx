/** Hostel Dashboard — occupancy KPIs, block-wise occupancy & room status. */

import React from 'react';
import { StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
} from '../../../components';
import { useAdminData } from '../../../hooks/useAdminData';
import { DistributionList, OpsList } from '../components';

export default function HostelDashboardScreen() {
  const { operations } = useAdminData();

  return (
    <TeacherScreen header={<ScreenHeader title="Hostel" />} contentStyle={styles.content}>
      <StatGrid items={operations.hostelKpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Occupancy" />
        <DistributionList rows={operations.hostelOccupancy} />
      </SurfaceCard>

      <SectionHeader title="Blocks" />
      <SurfaceCard padded={false} style={styles.card}>
        <OpsList rows={operations.hostelRooms} />
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  card: { paddingHorizontal: 14 },
});
