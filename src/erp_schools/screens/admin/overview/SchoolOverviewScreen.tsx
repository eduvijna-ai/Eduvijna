/**
 * School Overview — full institutional report (View Full Report from Admin Home).
 * Live data via useAdminDashboardData — attendance trend, class mix, fees,
 * admissions, ops modules. Charts replaced with mobile-friendly bars / rows.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  BarChart,
  ScreenLoader,
  EmptyState,
  ProgressBar,
  DonutChart,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminDashboardData } from '../../../hooks/useAdminDashboardData';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { formatCurrency, formatPct } from '../../../utils/adminDashboardMeta';

export default function SchoolOverviewScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const dash = useAdminDashboardData();

  const refetchRef = useRef(dash.refetch);
  refetchRef.current = dash.refetch;
  const onRefresh = useCallback(() => {
    void refetchRef.current();
  }, []);

  const overviewKpis = useMemo(
    () =>
      dash.kpis.map((kpi) => {
        if (kpi.key === 'students') {
          return {
            ...kpi,
            onPress: () => navigation.navigate('Classes', { initialTab: 'students' }),
          };
        }
        if (kpi.key === 'teachers') {
          return {
            ...kpi,
            onPress: () => navigation.navigate('Classes', { initialTab: 'teachers' }),
          };
        }
        if (kpi.key === 'classes') {
          return {
            ...kpi,
            onPress: () => navigation.navigate('Classes', { initialTab: 'classes' }),
          };
        }
        if (kpi.key === 'attendance') {
          return {
            ...kpi,
            onPress: () => navigation.navigate('AttendanceDashboard'),
          };
        }
        return kpi;
      }),
    [dash.kpis, navigation],
  );

  const trendBars = dash.trend.map((t) => {
    const d = t.date ? new Date(`${t.date}T12:00:00`) : null;
    const label =
      d && !Number.isNaN(d.getTime())
        ? d.toLocaleDateString(undefined, { weekday: 'short' })
        : t.date.slice(5) || '—';
    return { label, value: t.percentage || t.present };
  });

  const present = dash.trend.reduce((s, t) => s + t.present, 0);
  const absent = dash.trend.reduce((s, t) => s + t.absent, 0);
  const late = dash.trend.reduce((s, t) => s + t.late, 0);
  const classTotal = dash.classRows.reduce((s, c) => s + c.studentCount, 0) || 1;
  const topClasses = [...dash.classRows]
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, 8);

  if (dash.status === 'idle' || dash.status === 'loading') {
    return (
      <TeacherScreen header={<ScreenHeader title="School Overview" />}>
        <ScreenLoader message="Loading overview…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title="School Overview" />}
      contentStyle={styles.content}
      refreshing={dash.refreshing}
      onRefresh={onRefresh}
    >
      {dash.error ? (
        <EmptyState icon="cloud-offline-outline" title="Load error" message={dash.error} />
      ) : null}

      <StatGrid items={overviewKpis} columns={2} variant="tinted" />

      <SurfaceCard>
        <SectionHeader title="Attendance Trend (7 days)" />
        {trendBars.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            No attendance trend data yet.
          </Text>
        ) : (
          <BarChart data={trendBars} barColor={theme.colors.primary} />
        )}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Today's Attendance" />
        <View style={styles.attRow}>
          <DonutChart
            segments={[
              { value: present, color: theme.colors.success },
              { value: absent, color: theme.colors.danger },
              { value: late, color: theme.colors.warning },
            ]}
            size={110}
            strokeWidth={14}
            centerValue={formatPct(dash.todayAttendancePct, 0)}
            centerLabel="Present"
          />
          <View style={styles.legendCol}>
            <Legend color={theme.colors.success} label="Present" value={String(present)} />
            <Legend color={theme.colors.danger} label="Absent" value={String(absent)} />
            <Legend color={theme.colors.warning} label="Late" value={String(late)} />
            <Legend
              color={theme.colors.primary}
              label="Avg"
              value={formatPct(dash.avgAttendancePct, 1)}
            />
          </View>
        </View>
        <View style={styles.splitRow}>
          <View style={[styles.splitCard, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Text style={[styles.splitLabel, { color: theme.colors.textSecondary }]}>
              Teaching
            </Text>
            <Text style={[styles.splitValue, { color: theme.colors.textPrimary }]}>
              {formatPct(dash.staffSplit.teachingPct, 1)}
            </Text>
            <Text style={[styles.splitSub, { color: theme.colors.textSecondary }]}>
              {dash.staffSplit.teachingPresent}/{dash.staffSplit.teachingTotal}
            </Text>
            <ProgressBar percent={dash.staffSplit.teachingPct} height={6} />
          </View>
          <View style={[styles.splitCard, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Text style={[styles.splitLabel, { color: theme.colors.textSecondary }]}>
              Non-Teaching
            </Text>
            <Text style={[styles.splitValue, { color: theme.colors.textPrimary }]}>
              {formatPct(dash.staffSplit.nonTeachingPct, 1)}
            </Text>
            <Text style={[styles.splitSub, { color: theme.colors.textSecondary }]}>
              {dash.staffSplit.nonTeachingPresent}/{dash.staffSplit.nonTeachingTotal}
            </Text>
            <ProgressBar percent={dash.staffSplit.nonTeachingPct} height={6} />
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Students by Class" />
        {topClasses.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            Select an academic year to see class enrollment.
          </Text>
        ) : (
          topClasses.map((c, idx) => {
            const pct = Math.round((c.studentCount / classTotal) * 1000) / 10;
            return (
              <View key={`${c.classId}-${idx}`} style={styles.classRow}>
                <View style={styles.classTop}>
                  <Text style={[styles.className, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {c.label}
                  </Text>
                  <Text style={[styles.classMeta, { color: theme.colors.textSecondary }]}>
                    {pct}% ({c.studentCount})
                  </Text>
                </View>
                <ProgressBar percent={pct} height={6} color={theme.colors.primary} />
              </View>
            );
          })
        )}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Fee Overview" />
        <View style={styles.feeGrid}>
          {[
            { label: 'Total Due', value: formatCurrency(dash.fee.totalDue) },
            { label: 'Collected', value: formatCurrency(dash.fee.totalCollected) },
            { label: 'Pending', value: formatCurrency(dash.fee.totalPending) },
            { label: 'Overdue', value: formatCurrency(dash.fee.totalOverdue) },
            { label: 'Today', value: formatCurrency(dash.fee.todayCollection) },
            { label: 'This Month', value: formatCurrency(dash.fee.thisMonthCollection) },
            { label: 'Rate', value: formatPct(dash.fee.collectionRate, 0) },
            { label: 'Students w/ Dues', value: String(dash.fee.studentsWithDues) },
          ].map((item) => (
            <View
              key={item.label}
              style={[styles.feeCell, { backgroundColor: theme.colors.surfaceAlt }]}
            >
              <Text style={[styles.feeValue, { color: theme.colors.textPrimary }]}>{item.value}</Text>
              <Text style={[styles.feeLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Admissions Pipeline" />
        <View style={styles.feeGrid}>
          {[
            { label: 'Enquiries', value: dash.admissions.enquiries },
            { label: 'Applied', value: dash.admissions.applied },
            { label: 'Accepted', value: dash.admissions.accepted },
            { label: 'Enrolled', value: dash.admissions.enrolled },
            { label: 'Pending', value: dash.admissions.pending },
            { label: 'Admitted', value: dash.admissions.admitted },
          ].map((item) => (
            <View
              key={item.label}
              style={[styles.feeCell, { backgroundColor: theme.colors.surfaceAlt }]}
            >
              <Text style={[styles.feeValue, { color: theme.colors.textPrimary }]}>{item.value}</Text>
              <Text style={[styles.feeLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Operations Snapshot" />
        {[
          {
            title: 'Library',
            rows: [
              `Books ${dash.modules.library.books}`,
              `Issued ${dash.modules.library.issued}`,
              `Available ${dash.modules.library.available}`,
              `Overdue ${dash.modules.library.overdue}`,
            ],
          },
          {
            title: 'Transport',
            rows: [
              `Buses ${dash.modules.transport.vehicles}`,
              `Routes ${dash.modules.transport.routes}`,
              `Students ${dash.modules.transport.students}`,
            ],
          },
          {
            title: 'Hostel',
            rows: [
              `Rooms ${dash.modules.hostel.rooms}`,
              `Occupied ${dash.modules.hostel.occupied}`,
              `Available ${dash.modules.hostel.available}`,
              `Occupancy ${formatPct(dash.modules.hostel.occupancyPct, 0)}`,
            ],
          },
          {
            title: 'Inventory',
            rows: [
              `Items ${dash.modules.inventory.items}`,
              `Low ${dash.modules.inventory.lowStock}`,
              `Out ${dash.modules.inventory.outOfStock}`,
              `Value ${formatCurrency(dash.modules.inventory.totalValue)}`,
            ],
          },
          {
            title: 'Payroll',
            rows: [
              `Staff ${dash.modules.payroll.staff}`,
              `Processed ${dash.modules.payroll.processed}`,
              `Pending ${dash.modules.payroll.pending}`,
              `Net ${formatCurrency(dash.modules.payroll.totalNet)}`,
            ],
          },
        ].map((block) => (
          <View key={block.title} style={[styles.opsBlock, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.opsTitle, { color: theme.colors.textPrimary }]}>{block.title}</Text>
            <Text style={[styles.opsRows, { color: theme.colors.textSecondary }]}>
              {block.rows.join(' · ')}
            </Text>
          </View>
        ))}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Engagement & Safety" />
        <View style={styles.feeGrid}>
          {[
            { label: 'Open grievances', value: dash.grievances.open },
            { label: 'Resolved', value: dash.grievances.resolved },
            { label: 'Events (month)', value: dash.eventsThisMonth },
            {
              label: 'Active notices',
              value: dash.noticesCount,
              onPress: () => navigation.navigate('Announcements'),
            },
            { label: 'On campus', value: dash.visitors.onCampus },
            { label: 'Checked out', value: dash.visitors.checkedOut },
            { label: 'Visitor logs', value: dash.visitors.total },
            { label: 'Staff leave today', value: dash.staffLeaveToday },
          ].map((item) => {
            const content = (
              <>
                <Text style={[styles.feeValue, { color: theme.colors.textPrimary }]}>{item.value}</Text>
                <Text style={[styles.feeLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
              </>
            );
            const cellStyle = [styles.feeCell, { backgroundColor: theme.colors.surfaceAlt }];
            if ('onPress' in item && item.onPress) {
              return (
                <TouchableOpacity
                  key={item.label}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                  style={cellStyle}
                >
                  {content}
                </TouchableOpacity>
              );
            }
            return (
              <View key={item.label} style={cellStyle}>
                {content}
              </View>
            );
          })}
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.legendValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16, paddingBottom: 28 },
  empty: { fontSize: 12, paddingVertical: 8 },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legendCol: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 12 },
  legendValue: { fontSize: 12, fontWeight: '700' },
  splitRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  splitCard: { flex: 1, borderRadius: 12, padding: 10, gap: 4 },
  splitLabel: { fontSize: 11 },
  splitValue: { fontSize: 18, fontWeight: '800' },
  splitSub: { fontSize: 10, marginBottom: 4 },
  classRow: { marginBottom: 10, gap: 4 },
  classTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  className: { fontSize: 13, fontWeight: '600', flex: 1 },
  classMeta: { fontSize: 11 },
  feeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feeCell: { width: '47%', flexGrow: 1, borderRadius: 12, padding: 12 },
  feeValue: { fontSize: 15, fontWeight: '800' },
  feeLabel: { fontSize: 11, marginTop: 2 },
  opsBlock: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  opsTitle: { fontSize: 13, fontWeight: '700' },
  opsRows: { fontSize: 12, marginTop: 4, lineHeight: 18 },
});
