/**
 * ERP Dashboard Screen
 * Shows KPI summary, 7-day attendance trend chart, recent notices, overdue fees, and admission counts.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import {
  erpDashboardApi,
  classOverviewApi,
  staffAttendanceApi,
  noticesApi,
  feeCollectionsApi,
  admissionsApi,
} from '../../core/api/erp.api';
import {
  COLORS,
  KpiCard,
  LoadingState,
  EmptyState,
  SectionHeader,
  ListRow,
  StatusBadge,
} from '../components/common';
import { useErpRole } from '../hooks/useErpRole';
import { useAcademicYear } from '../contexts/AcademicYearContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function DashboardScreen() {
  const { schoolId, isAdmin, isTeacher } = useErpRole();
  const { selectedYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [kpis, setKpis] = useState<any>(null);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const [overdueFees, setOverdueFees] = useState<any[]>([]);
  const [admissionCounts, setAdmissionCounts] = useState<any>(null);
  const [staffOnLeave, setStaffOnLeave] = useState<number>(0);
  const [classStats, setClassStats] = useState<{ classes: number; students: number; staff: number }>({
    classes: 0, students: 0, staff: 0,
  });

  const load = useCallback(async () => {
    try {
      const params: any = schoolId ? { school_id: schoolId } : {};
      const kpiParams = selectedYearId ? { ...params, academic_year_id: selectedYearId } : params;

      // Always fetch: dashboard summary, class KPIs, notices
      const [dashData, classKpiData, noticesData] = await Promise.all([
        erpDashboardApi.get(7, schoolId, selectedYearId ?? undefined).catch(() => null),
        classOverviewApi.getKPIs(kpiParams).catch(() => null),
        noticesApi.getAll({ per_page: 5, ...params }).catch(() => null),
      ]);

      if (dashData) {
        setKpis(dashData?.kpis ?? dashData);
        const trend: any[] = dashData?.attendance_trend ?? [];
        setAttendanceTrend(trend);
      }

      if (classKpiData) {
        const items: any[] = classKpiData?.items ?? classKpiData ?? [];
        const students = items.reduce((s: number, r: any) => s + (r.student_count ?? 0), 0);
        const teacherSet = new Set(items.flatMap((r: any) => (r.teacher_name ? [r.teacher_name] : [])));
        setClassStats({ classes: items.length, students, staff: teacherSet.size });
      }

      if (noticesData) setRecentNotices(noticesData?.items ?? noticesData ?? []);

      // Admin-only: overdue fees, admissions, staff on leave
      if (isAdmin) {
        const [feeData, admissionsData, staffData] = await Promise.all([
          feeCollectionsApi.list({ status: 'overdue', per_page: 5, ...params }).catch(() => null),
          admissionsApi.statusCounts(params).catch(() => null),
          staffAttendanceApi.getAll({ status: 'leave', per_page: 20, ...params }).catch(() => null),
        ]);
        if (feeData) setOverdueFees(feeData?.items ?? feeData ?? []);
        if (admissionsData) setAdmissionCounts(admissionsData);
        if (staffData) {
          const items: any[] = staffData?.items ?? staffData ?? [];
          setStaffOnLeave(items.length);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId, isAdmin, selectedYearId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  // Build chart data from attendance trend
  const trendLabels = attendanceTrend.map((t: any) => {
    const d = new Date(t.date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });
  const presentData = attendanceTrend.map((t: any) => t.present ?? 0);
  const absentData  = attendanceTrend.map((t: any) => t.absent  ?? 0);
  const hasTrend = attendanceTrend.length >= 2;

  if (loading) return <LoadingState />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* KPI Row 1 */}
      <SectionHeader title="Overview" />
      <View style={styles.kpiRow}>
        <KpiCard label="Classes"  value={kpis?.total_classes  ?? classStats.classes}  color={COLORS.primary}  icon="school-outline" />
        <KpiCard label="Students" value={kpis?.total_students ?? classStats.students} color="#8b5cf6" icon="people-outline" />
        <KpiCard label="Staff"    value={kpis?.total_staff    ?? classStats.staff}    color="#10b981" icon="person-outline" />
      </View>

      {isAdmin && (
        <View style={styles.kpiRow}>
          <KpiCard label="On Leave"     value={staffOnLeave}             color={COLORS.warning} icon="airplane-outline" />
          <KpiCard label="Enquiries"    value={admissionCounts?.enquiry ?? 0} color="#06b6d4"  icon="person-add-outline" />
          <KpiCard label="Overdue Fees" value={overdueFees.length}       color={COLORS.danger}  icon="cash-outline" />
        </View>
      )}

      {/* 7-day Attendance Trend */}
      {hasTrend && (
        <>
          <SectionHeader title="Attendance Trend (7 days)" />
          <View style={styles.chartCard}>
            <LineChart
              data={{
                labels: trendLabels,
                datasets: [
                  { data: presentData, color: () => '#22c55e', strokeWidth: 2 },
                  { data: absentData,  color: () => '#ef4444', strokeWidth: 2 },
                ],
                legend: ['Present', 'Absent'],
              }}
              width={SCREEN_WIDTH - 40}
              height={180}
              chartConfig={{
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59,130,246,${opacity})`,
                labelColor: () => COLORS.gray[500],
                propsForDots: { r: '4' },
                propsForBackgroundLines: { stroke: COLORS.gray[100] },
              }}
              bezier
              style={{ borderRadius: 12 }}
            />
          </View>
        </>
      )}

      {/* Recent Notices */}
      <SectionHeader title="Recent Notices" />
      {recentNotices.length === 0 ? (
        <EmptyState message="No notices." />
      ) : (
        recentNotices.map((n) => (
          <ListRow
            key={n.id}
            title={n.title}
            subtitle={n.category}
            badge={n.category}
            badgeColor={COLORS.primary}
          />
        ))
      )}

      {/* Overdue Fees (admin) */}
      {isAdmin && overdueFees.length > 0 && (
        <>
          <SectionHeader title="Overdue Fee Collections" />
          {overdueFees.map((f) => (
            <ListRow
              key={f.id}
              title={f.student_name ?? `Collection #${f.id}`}
              subtitle={`₹${f.amount_due ?? f.amount ?? 0}`}
              rightComponent={<StatusBadge status="overdue" />}
            />
          ))}
        </>
      )}

      {/* Admission Pipeline (admin) */}
      {isAdmin && admissionCounts && Object.keys(admissionCounts).length > 0 && (
        <>
          <SectionHeader title="Admissions by Status" />
          <View style={styles.kpiRow}>
            {Object.entries(admissionCounts)
              .filter(([k]) => k !== 'total')
              .map(([status, count]) => (
                <KpiCard
                  key={status}
                  label={status.replace(/_/g, ' ')}
                  value={count as number}
                  color={COLORS.primary}
                />
              ))}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chartCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});
