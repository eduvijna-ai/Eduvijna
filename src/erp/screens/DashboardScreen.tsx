/**
 * ERP Dashboard Screen
 * Shows KPI summary, attendance overview, recent notices, overdue fees, and admission counts.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {
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

interface DashboardKpi {
  total_classes: number;
  total_students: number;
  total_staff: number;
  attendance_today_pct: number;
}

export default function DashboardScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const { selectedYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [kpis, setKpis] = useState<DashboardKpi | null>(null);
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const [overdueFees, setOverdueFees] = useState<any[]>([]);
  const [admissionCounts, setAdmissionCounts] = useState<any>(null);
  const [staffOnLeave, setStaffOnLeave] = useState<number>(0);

  const load = useCallback(async () => {
    try {
      const params = schoolId ? { school_id: schoolId } : {};

      const kpiParams = selectedYearId ? { ...params, academic_year_id: selectedYearId } : params;
      const [classKpiData, noticesData] = await Promise.all([
        classOverviewApi.getKPIs(kpiParams).catch(() => null),
        noticesApi.getAll({ per_page: 5, ...params }).catch(() => null),
      ]);

      if (classKpiData) {
        const items = classKpiData?.items ?? classKpiData ?? [];
        const students = items.reduce((s: number, r: any) => s + (r.student_count ?? 0), 0);
        const teachers = new Set(
          items.flatMap((r: any) => (r.teacher_name ? [r.teacher_name] : [])),
        ).size;
        setKpis({
          total_classes: items.length,
          total_students: students,
          total_staff: teachers,
          attendance_today_pct: 0,
        });
      }

      if (noticesData) {
        setRecentNotices(noticesData?.items ?? noticesData ?? []);
      }

      if (isAdmin) {
        const [feeData, admissionsData, staffData] = await Promise.all([
          feeCollectionsApi.list({ status: 'overdue', per_page: 5, ...params }).catch(() => null),
          admissionsApi.statusCounts(params).catch(() => null),
          staffAttendanceApi.getAll({ status: 'leave', per_page: 10, ...params }).catch(() => null),
        ]);

        if (feeData) setOverdueFees(feeData?.items ?? feeData ?? []);
        if (admissionsData) setAdmissionCounts(admissionsData);
        if (staffData) {
          const items = staffData?.items ?? staffData ?? [];
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

  if (loading) return <LoadingState />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* KPI Row */}
      <SectionHeader title="Overview" />
      <View style={styles.kpiRow}>
        <KpiCard label="Classes" value={kpis?.total_classes ?? 0} color={COLORS.primary} icon="school-outline" />
        <KpiCard label="Students" value={kpis?.total_students ?? 0} color="#8b5cf6" icon="people-outline" />
        <KpiCard label="Staff" value={kpis?.total_staff ?? 0} color="#10b981" icon="person-outline" />
      </View>

      {isAdmin && (
        <View style={styles.kpiRow}>
          <KpiCard label="Staff on Leave" value={staffOnLeave} color={COLORS.warning} icon="airplane-outline" />
          <KpiCard
            label="Enquiries"
            value={admissionCounts?.enquiry ?? 0}
            color="#06b6d4"
            icon="person-add-outline"
          />
          <KpiCard
            label="Overdue Fees"
            value={overdueFees.length}
            color={COLORS.danger}
            icon="cash-outline"
          />
        </View>
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

      {/* Admission Counts (admin) */}
      {isAdmin && admissionCounts && (
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
    paddingVertical: 10,
  },
});
