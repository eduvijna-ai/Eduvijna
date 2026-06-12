/** Transport Dashboard — fleet KPIs, live route status & links to vehicles/routes. */

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

export default function TransportDashboardScreen() {
  const navigation = useAdminNavigation();
  const { operations } = useAdminData();

  return (
    <TeacherScreen header={<ScreenHeader title="Transport" />} contentStyle={styles.content}>
      <StatGrid items={operations.transportKpis} columns={2} variant="tinted" />

      <SectionHeader title="Live Route Status" />
      <SurfaceCard padded={false} style={styles.card}>
        <OpsList rows={operations.transportRoutes} />
      </SurfaceCard>

      <SurfaceCard padded={false} style={styles.card}>
        <ListItem
          icon="bus-outline"
          iconAccent="teal"
          title="Vehicle Management"
          subtitle="Fleet, drivers & maintenance"
          showChevron
          onPress={() => navigation.navigate('VehicleManagement')}
        />
        <ListItem
          icon="map-outline"
          iconAccent="blue"
          title="Route Management"
          subtitle="Stops, distance & assignments"
          divider={false}
          showChevron
          onPress={() => navigation.navigate('RouteManagement')}
        />
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  card: { paddingHorizontal: 14 },
});
