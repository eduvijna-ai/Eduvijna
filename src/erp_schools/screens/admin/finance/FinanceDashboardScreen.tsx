/**
 * Finance Dashboard (Finance tab) — KPIs, collection trend, distribution donut,
 * fee-type breakdown, recent transactions, concessions, quick links.
 * Reference: assets/admin_screens/admin finance overview screen.png
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  BarChart,
  ListItem,
  QuickActionGrid,
  type QuickAction,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useAdminData } from '../../../hooks/useAdminData';
import { accentColors } from '../../../theme/accents';
import { DistributionList, DonutLegend } from '../components';

export default function FinanceDashboardScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const { finance } = useAdminData();

  const links: QuickAction[] = [
    { key: 'collect', icon: 'cash-outline', label: 'Fee Collection', accent: 'green', onPress: () => navigation.navigate('FeeCollection') },
    { key: 'revenue', icon: 'trending-up-outline', label: 'Revenue', accent: 'teal', onPress: () => navigation.navigate('RevenueAnalytics') },
    { key: 'expense', icon: 'trending-down-outline', label: 'Expenses', accent: 'red', onPress: () => navigation.navigate('ExpenseAnalytics') },
    { key: 'reports', icon: 'document-text-outline', label: 'Reports', accent: 'blue', onPress: () => navigation.navigate('ReportsDashboard') },
  ];

  return (
    <TeacherScreen contentStyle={styles.content}>
      <View>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Finance Overview</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Collections, revenue & expenses</Text>
      </View>

      <StatGrid items={finance.kpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Fee Collection Trend" />
        <BarChart data={finance.collectionTrend.map((p) => ({ label: p.label, value: p.value }))} />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Collection Distribution" />
        <DonutLegend rows={finance.collectionDistribution} centerValue="₹15.15L" centerLabel="Total" />
      </SurfaceCard>

      <View style={styles.feeGrid}>
        {finance.feeTypes.map((ft) => {
          const accent = accentColors(theme.colors, ft.accent);
          return (
            <SurfaceCard key={ft.id} style={styles.feeCard}>
              <View style={[styles.feeIcon, { backgroundColor: accent.bg }]}>
                <Ionicons name={ft.icon} size={18} color={accent.fg} />
              </View>
              <Text style={[styles.feeAmount, { color: theme.colors.textPrimary }]}>{ft.amountLabel}</Text>
              <Text style={[styles.feeLabel, { color: theme.colors.textSecondary }]}>{ft.label}</Text>
              <Text style={[styles.feePercent, { color: theme.colors.textSecondary }]}>{ft.percentLabel}</Text>
            </SurfaceCard>
          );
        })}
      </View>

      <SurfaceCard>
        <SectionHeader title="Recent Transactions" actionLabel="View All" onAction={() => navigation.navigate('FeeCollection')} />
        {finance.transactions.map((tx, index) => (
          <ListItem
            key={tx.id}
            avatarName={tx.name}
            title={tx.name}
            subtitle={tx.meta}
            divider={index < finance.transactions.length - 1}
            trailing={
              <View style={styles.txTrailing}>
                <Text style={[styles.txAmount, { color: theme.colors.success }]}>₹{tx.amount.toLocaleString('en-IN')}</Text>
                <Text style={[styles.txMethod, { color: theme.colors.textSecondary }]}>{tx.method}</Text>
              </View>
            }
          />
        ))}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Fee Concessions" />
        <DistributionList rows={finance.concessions} />
      </SurfaceCard>

      <View>
        <SectionHeader title="Quick Links" />
        <QuickActionGrid actions={links} columns={4} />
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },

  feeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  feeCard: { width: '48%', gap: 4 },
  feeIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  feeAmount: { fontSize: 18, fontWeight: '800' },
  feeLabel: { fontSize: 12, fontWeight: '600' },
  feePercent: { fontSize: 11 },

  txTrailing: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txMethod: { fontSize: 11, marginTop: 2 },
});
