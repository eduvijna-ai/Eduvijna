/**
 * My Attendance — self check-in / check-out dashboard.
 * Reference: assets/teachers_screens/teachers_own_attandance_marking_screen-2.png
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  TeacherTopBar,
  HeroCard,
  SurfaceCard,
  SectionHeader,
  PrimaryButton,
  Avatar,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { teacherProfile, selfMonthOverview, notifications } from '../../../data';

type Mode = 'in' | 'out';

export default function MyAttendanceScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const [mode, setMode] = useState<Mode>('in');
  const unread = notifications.filter((n) => !n.read).length;

  const overview = [
    { key: 'present', label: 'Present', value: selfMonthOverview.present, icon: 'checkmark-circle' as const, color: theme.colors.success },
    { key: 'absent', label: 'Absent', value: selfMonthOverview.absent, icon: 'close-circle' as const, color: theme.colors.danger },
    { key: 'late', label: 'Late', value: selfMonthOverview.late, icon: 'time' as const, color: theme.colors.warning },
    { key: 'half', label: 'Half Day', value: selfMonthOverview.halfDay, icon: 'contrast' as const, color: theme.colors.textSecondary },
  ];

  return (
    <TeacherScreen
      header={
        <TeacherTopBar
          userName={teacherProfile.name}
          notificationCount={unread}
          onPressNotifications={() => navigation.navigate('Notifications')}
          onPressProfile={() => navigation.navigate('Profile')}
        />
      }
      contentStyle={styles.content}
      footer={
        <View style={styles.footerWrap}>
          <PrimaryButton
            label={mode === 'in' ? 'Check In Now' : 'Check Out Now'}
            icon="finger-print"
            variant="gradient"
            onPress={() => Alert.alert(mode === 'in' ? 'Checked In' : 'Checked Out', 'Recorded at 09:41 AM (demo).')}
          />
          <Text style={[styles.footerNote, { color: theme.colors.textSecondary }]}>Your location will be captured for verification</Text>
        </View>
      }
    >
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Mark My Attendance</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Track your attendance and punctuality</Text>
      </View>

      <HeroCard>
        <View style={styles.heroRow}>
          <Avatar name={teacherProfile.name} uri={teacherProfile.avatarUrl} size={56} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{teacherProfile.name}</Text>
            <View style={styles.heroRoleRow}>
              <Text style={styles.heroRole}>{teacherProfile.role}</Text>
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeText}>{teacherProfile.employeeId}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMeta}>
            <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.9)" />
            <View>
              <Text style={styles.heroMetaValue}>Today, 12 May 2025</Text>
              <Text style={styles.heroMetaLabel}>Monday</Text>
            </View>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroMeta}>
            <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.9)" />
            <View>
              <Text style={styles.heroMetaLabel}>Current Time</Text>
              <Text style={styles.heroMetaValue}>09:41 AM</Text>
            </View>
          </View>
        </View>
      </HeroCard>

      <SectionHeader title="Mark Attendance" />
      <View style={styles.modeRow}>
        <ModeCard
          active={mode === 'in'}
          icon="checkmark"
          title="Check In"
          subtitle={'I am reporting\nto school'}
          tone={theme.colors.success}
          onPress={() => setMode('in')}
        />
        <ModeCard
          active={mode === 'out'}
          icon="exit-outline"
          title="Check Out"
          subtitle={'I am leaving\nfrom school'}
          tone={theme.colors.textSecondary}
          onPress={() => setMode('out')}
        />
      </View>

      <SurfaceCard onPress={() => navigation.navigate('AttendanceCalendar')}>
        <View style={styles.lastRow}>
          <View style={[styles.lastIcon, { backgroundColor: theme.colors.tintGreen }]}>
            <Ionicons name="shield-checkmark" size={18} color={theme.colors.success} />
          </View>
          <View style={styles.lastInfo}>
            <Text style={[styles.lastTitle, { color: theme.colors.textPrimary }]}>Last Check In</Text>
            <Text style={[styles.lastSub, { color: theme.colors.textSecondary }]}>{selfMonthOverview.lastCheckIn}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </View>
      </SurfaceCard>

      <SectionHeader title="This Month Overview" actionLabel="View Calendar" onAction={() => navigation.navigate('AttendanceCalendar')} />
      <SurfaceCard>
        <View style={styles.overviewRow}>
          {overview.map((item) => (
            <View key={item.key} style={styles.overviewItem}>
              <Ionicons name={item.icon} size={20} color={item.color} />
              <Text style={[styles.overviewValue, { color: theme.colors.textPrimary }]}>{item.value}</Text>
              <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard style={{ backgroundColor: theme.colors.tintBlue }}>
        <View style={styles.policyRow}>
          <View style={[styles.policyIcon, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="calendar-clear-outline" size={18} color={theme.colors.info} />
          </View>
          <View style={styles.policyText}>
            <Text style={[styles.policyTitle, { color: theme.colors.textPrimary }]}>Attendance Policy</Text>
            <Text style={[styles.policySub, { color: theme.colors.textSecondary }]}>Please make sure to mark your attendance during school hours.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

function ModeCard({
  active,
  icon,
  title,
  subtitle,
  tone,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  tone: string;
  onPress: () => void;
}) {
  const theme = useTeacherTheme();
  return (
    <TouchableOpacity
      style={[
        styles.modeCard,
        theme.shadow.light,
        {
          backgroundColor: active ? theme.colors.tintGreen : theme.colors.surface,
          borderColor: active ? theme.colors.success : theme.colors.border,
          borderRadius: theme.radius.card,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={title}
    >
      <View style={[styles.modeIcon, { backgroundColor: tone }]}>
        <Ionicons name={icon} size={22} color="#FFFFFF" />
      </View>
      <Text style={[styles.modeTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.modeSub, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  titleBlock: { gap: 2 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13 },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  heroRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroRole: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  idBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  idBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  heroMeta: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },
  heroMetaValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  heroMetaLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },

  modeRow: { flexDirection: 'row', gap: 12 },
  modeCard: { flex: 1, borderWidth: 1.5, padding: 16, alignItems: 'center', gap: 8 },
  modeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  modeTitle: { fontSize: 15, fontWeight: '700' },
  modeSub: { fontSize: 12, textAlign: 'center', lineHeight: 16 },

  lastRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lastIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  lastInfo: { flex: 1 },
  lastTitle: { fontSize: 14, fontWeight: '700' },
  lastSub: { fontSize: 12, marginTop: 2 },

  overviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  overviewItem: { flex: 1, alignItems: 'center', gap: 3 },
  overviewValue: { fontSize: 20, fontWeight: '800' },
  overviewLabel: { fontSize: 11 },

  policyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  policyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  policyText: { flex: 1 },
  policyTitle: { fontSize: 14, fontWeight: '700' },
  policySub: { fontSize: 12, marginTop: 2 },

  footerWrap: { gap: 8 },
  footerNote: { fontSize: 11, textAlign: 'center' },
});
