/**
 * ERP Main Screen — Module tile grid
 * Entry point for the School ERP section.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useErpRole } from '../hooks/useErpRole';
import { COLORS } from '../components/common';

interface Module {
  key: string;
  label: string;
  icon: string;
  color: string;
  route: string;
  adminOnly?: boolean;
}

const MODULES: Module[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', color: '#3b82f6', route: 'ERPDashboard' },
  { key: 'class_overview', label: 'Class Overview', icon: 'school-outline', color: '#8b5cf6', route: 'ERPClassOverview' },
  { key: 'academic_setup', label: 'Academic Setup', icon: 'book-outline', color: '#10b981', route: 'ERPAcademicSetup', adminOnly: true },
  { key: 'attendance', label: 'Attendance', icon: 'checkmark-circle-outline', color: '#f59e0b', route: 'ERPAttendance' },
  { key: 'notices', label: 'Notices', icon: 'megaphone-outline', color: '#ef4444', route: 'ERPNotices' },
  { key: 'admissions', label: 'Admissions', icon: 'person-add-outline', color: '#06b6d4', route: 'ERPAdmissions', adminOnly: true },
  { key: 'exams', label: 'Exams', icon: 'clipboard-outline', color: '#f97316', route: 'ERPExams' },
  { key: 'timetable', label: 'Timetable', icon: 'calendar-outline', color: '#84cc16', route: 'ERPTimetable' },
  { key: 'fees', label: 'Fees', icon: 'cash-outline', color: '#14b8a6', route: 'ERPFees', adminOnly: true },
  { key: 'hr', label: 'HR & Payroll', icon: 'people-outline', color: '#6366f1', route: 'ERPHR', adminOnly: true },
  { key: 'library', label: 'Library', icon: 'library-outline', color: '#a16207', route: 'ERPLibrary' },
  { key: 'transport', label: 'Transport', icon: 'bus-outline', color: '#0891b2', route: 'ERPTransport' },
  { key: 'hostel', label: 'Hostel', icon: 'home-outline', color: '#7c3aed', route: 'ERPHostel' },
  { key: 'inventory', label: 'Inventory', icon: 'cube-outline', color: '#b45309', route: 'ERPInventory', adminOnly: true },
  { key: 'engagement', label: 'Engagement', icon: 'star-outline', color: '#db2777', route: 'ERPEngagement' },
  { key: 'safety', label: 'Safety', icon: 'shield-checkmark-outline', color: '#dc2626', route: 'ERPSafety', adminOnly: true },
  { key: 'parent_portal', label: 'Parent Portal', icon: 'heart-outline', color: '#ec4899', route: 'ERPParentPortal' },
  { key: 'holidays', label: 'Holidays', icon: 'sunny-outline', color: '#d97706', route: 'ERPHolidayCalendar' },
  { key: 'lms', label: 'LMS', icon: 'desktop-outline', color: '#0ea5e9', route: 'ERPLMS' },
  { key: 'forms', label: 'Forms', icon: 'document-text-outline', color: '#8b5cf6', route: 'ERPForms', adminOnly: true },
  { key: 'biometric', label: 'Biometric', icon: 'finger-print-outline', color: '#059669', route: 'ERPBiometric', adminOnly: true },
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart-outline', color: '#dc2626', route: 'ERPAnalytics', adminOnly: true },
];

export default function ERPMainScreen() {
  const navigation = useNavigation<any>();
  const { isAdmin, isSuperAdmin } = useErpRole();

  const visibleModules = MODULES.filter(
    (m) => !m.adminOnly || isAdmin || isSuperAdmin,
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>School ERP</Text>
        <Text style={styles.headerSub}>Manage your institution</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {visibleModules.map((mod) => (
          <TouchableOpacity
            key={mod.key}
            style={styles.tile}
            onPress={() => navigation.navigate(mod.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: mod.color + '18' }]}>
              <Ionicons name={mod.icon as any} size={28} color={mod.color} />
            </View>
            <Text style={styles.tileLabel}>{mod.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  header: {
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.gray[800] },
  headerSub: { fontSize: 11, color: COLORS.gray[500], marginTop: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 10,
  },
  tile: {
    width: '30%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.gray[700],
    textAlign: 'center',
  },
});
