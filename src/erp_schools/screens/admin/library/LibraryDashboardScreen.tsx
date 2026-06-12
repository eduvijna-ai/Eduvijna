/** Library Dashboard — library KPIs, recent activity & link to book management. */

import React from 'react';
import { StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  ListItem,
} from '../../../components';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useAdminData } from '../../../hooks/useAdminData';
import { OpsList } from '../components';

export default function LibraryDashboardScreen() {
  const navigation = useAdminNavigation();
  const { operations } = useAdminData();

  return (
    <TeacherScreen header={<ScreenHeader title="Library" />} contentStyle={styles.content}>
      <StatGrid items={operations.libraryKpis} columns={2} variant="tinted" />

      <SectionHeader title="Recent Activity" />
      <SurfaceCard padded={false} style={styles.card}>
        <OpsList rows={operations.libraryActivity} />
      </SurfaceCard>

      <SurfaceCard padded={false} style={styles.card}>
        <ListItem
          icon="library-outline"
          iconAccent="purple"
          title="Book Management"
          subtitle="Catalog, categories & stock"
          divider={false}
          showChevron
          onPress={() => navigation.navigate('BookManagement')}
        />
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  card: { paddingHorizontal: 14 },
});
