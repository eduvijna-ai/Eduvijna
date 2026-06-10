/**
 * Teacher Home — dashboard with full-width welcome hero + overlapping overview card.
 * Reference: assets/teachers_screens/teachers_home screen.png
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  TeacherTopBar,
  SurfaceCard,
  SectionHeader,
  QuickActionGrid,
  Badge,
  type QuickAction,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherSession } from '../../../hooks/useTeacherSession';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherUIStore } from '../../../store/teacherUI.store';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { notifications, teacherProfile } from '../../../data';
import { FONT_FAMILY } from '../../../../theme/fonts';

interface OverviewMetric {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}

/** How far the overview card rises into the welcome hero (reference overlap). */
const HERO_OVERLAP = 72;
const HERO_TOP_RADIUS = 24;

export default function TeacherHomeScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { displayName } = useTeacherSession();
  const { overview, classes, schedule, announcements } = useTeacherData();
  const overviewRange = useTeacherUIStore((s) => s.overviewRange);
  const firstClassId = classes[0]?.id;

  const unread = notifications.filter((n) => !n.read).length;
  const welcomeName = teacherProfile.name || displayName;

  const metrics: OverviewMetric[] = [
    { key: 'students', icon: 'people-outline', value: String(overview.students), label: 'My Students' },
    { key: 'classes', icon: 'book-outline', value: String(overview.classes), label: 'My Classes' },
    { key: 'assignments', icon: 'clipboard-outline', value: String(overview.assignments), label: 'Assignments' },
    { key: 'attendance', icon: 'calendar-outline', value: `${overview.avgAttendance}%`, label: 'Avg Attendance' },
  ];

  const actions: QuickAction[] = [
    { key: 'attendance', icon: 'checkbox-outline', label: 'Take Attendance', accent: 'teal', onPress: () => navigation.navigate('MarkAttendance', { classId: firstClassId }) },
    { key: 'assignment', icon: 'document-text-outline', label: 'Create Assignment', accent: 'blue', onPress: () => navigation.navigate('CreateAssignment') },
    { key: 'grade', icon: 'ribbon-outline', label: 'Grade Students', accent: 'green', onPress: () => navigation.navigate('GradeStudents', {}) },
    { key: 'material', icon: 'book-outline', label: 'Study Material', accent: 'purple', onPress: () => navigation.navigate('StudyMaterial', {}) },
    { key: 'timetable', icon: 'time-outline', label: 'Class Timetable', accent: 'orange', onPress: () => navigation.navigate('Timetable', {}) },
    { key: 'notice', icon: 'megaphone-outline', label: 'Notice Board', accent: 'pink', onPress: () => navigation.navigate('NoticeBoard', {}) },
    { key: 'reports', icon: 'bar-chart-outline', label: 'Reports', accent: 'red', onPress: () => navigation.navigate('ReportsDashboard') },
    { key: 'parents', icon: 'people-circle-outline', label: 'Parent Communication', accent: 'teal', onPress: () => navigation.navigate('ParentCommunication', {}) },
  ];

  return (
    <TeacherScreen
      header={
        <TeacherTopBar
          userName={teacherProfile.name}
          avatarUrl={teacherProfile.avatarUrl}
          notificationCount={unread}
          onPressNotifications={() => navigation.navigate('Notifications')}
          onPressProfile={() => navigation.navigate('Profile')}
        />
      }
      contentStyle={styles.scrollContent}
    >
      {/* Full-width welcome hero — solid teal, rounded top corners */}
      <View
        style={[
          styles.heroClip,
          {
            borderTopLeftRadius: HERO_TOP_RADIUS,
            borderTopRightRadius: HERO_TOP_RADIUS,
            backgroundColor: theme.colors.primary,
          },
        ]}
      >
        <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
          <Image
            source={require('../../../../../assets/eduvijna_logo_sidebar_white.png')}
            style={styles.heroWatermark}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroGreeting} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              <Text style={styles.heroGreetingLead}>Welcome, </Text>
              <Text style={styles.heroGreetingName}>{welcomeName}</Text>
              <Text style={styles.heroGreetingLead}> 👋</Text>
            </Text>
            <Text style={styles.heroSub}>Good morning! Let&apos;s inspire and empower today.</Text>
          </View>
        </View>
      </View>

      {/* Overview card — overlaps hero */}
      <View style={styles.overviewWrap}>
        <SurfaceCard style={[styles.overviewCard, theme.shadow.medium]}>
          <View style={styles.overviewHeader}>
            <View style={styles.overviewTitleRow}>
              <Ionicons name="people-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.overviewTitle, { color: theme.colors.textPrimary }]}>Overview</Text>
            </View>
            <View style={[styles.rangePill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.rangeText, { color: theme.colors.textSecondary }]}>{overviewRange}</Text>
              <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
            </View>
          </View>

          <View style={styles.metricsRow}>
            {metrics.map((metric, index) => (
              <React.Fragment key={metric.key}>
                {index > 0 ? (
                  <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
                ) : null}
                <View style={styles.metric}>
                  <Ionicons name={metric.icon} size={22} color={theme.colors.primary} />
                  <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{metric.value}</Text>
                  <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {metric.label}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Quick Actions" actionLabel="View All" onAction={() => navigation.navigate('TeacherTabs', { screen: 'TeacherMore' })} />
        <QuickActionGrid actions={actions} columns={4} />
      </View>

      <SurfaceCard style={styles.section}>
        <SectionHeader
          title="Today's Schedule"
          icon="calendar-outline"
          actionLabel="View Timetable"
          onAction={() => navigation.navigate('Timetable', {})}
        />
        {schedule.map((period, index) => (
          <View
            key={period.id}
            style={[
              styles.scheduleRow,
              index < schedule.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <Text style={[styles.scheduleTime, { color: theme.colors.textSecondary }]}>
              {period.startTime}{'\n'}– {period.endTime}
            </Text>
            <View style={[styles.scheduleDot, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.scheduleInfo}>
              <Text style={[styles.scheduleClass, { color: theme.colors.textPrimary }]}>Class {period.classCode}</Text>
              <Text style={[styles.scheduleSubject, { color: theme.colors.textSecondary }]}>{period.subject}</Text>
            </View>
            <View style={[styles.roomChip, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.roomText, { color: theme.colors.textSecondary }]}>{period.room}</Text>
            </View>
          </View>
        ))}
      </SurfaceCard>

      <SurfaceCard style={styles.section}>
        <SectionHeader
          title="Recent Announcements"
          icon="megaphone-outline"
          actionLabel="View All"
          onAction={() => navigation.navigate('NoticeBoard', {})}
        />
        {announcements.map((item) => (
          <View key={item.id} style={styles.announceRow}>
            <View style={[styles.announceIcon, { backgroundColor: theme.colors.tintTeal }]}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.announceBody}>
              <View style={styles.announceTitleRow}>
                {item.isNew ? <Badge label="NEW" accent="green" /> : null}
                <Text style={[styles.announceTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text>
              </View>
              <Text style={[styles.announceText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {item.body}
              </Text>
            </View>
            <Text style={[styles.announceDate, { color: theme.colors.textSecondary }]}>{item.date}</Text>
          </View>
        ))}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 0, paddingTop: 0 },

  heroClip: {
    width: '100%',
    overflow: 'hidden',
  },
  hero: {
    width: '100%',
    minHeight: 132,
    paddingBottom: HERO_OVERLAP + 20,
    position: 'relative',
  },
  heroWatermark: {
    position: 'absolute',
    right: -32,
    top: -16,
    width: 240,
    height: 240,
    opacity: 0.12,
  },
  heroTextWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    paddingRight: 100,
  },
  heroGreeting: { color: '#FFFFFF', fontSize: 24, lineHeight: 30 },
  heroGreetingLead: { fontFamily: FONT_FAMILY.medium, fontWeight: '500' },
  heroGreetingName: { fontFamily: FONT_FAMILY.bold, fontWeight: '700' },
  heroSub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11,
    fontWeight: '400',
    marginTop: 8,
    lineHeight: 20,
  },

  overviewWrap: {
    marginTop: -HERO_OVERLAP,
    paddingHorizontal: 16,
    zIndex: 2,
    elevation: 4,
    marginBottom: 4,
  },
  overviewCard: {
    borderRadius: 16,
    elevation: 3,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  overviewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overviewTitle: { fontSize: 16, fontWeight: '700' },
  rangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rangeText: { fontSize: 12, fontWeight: '600' },

  metricsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  metric: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  metricDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 4 },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: { fontSize: 11, textAlign: 'center', lineHeight: 14 },

  section: { marginTop: 16, marginHorizontal: 16 },

  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  scheduleTime: { fontSize: 11, width: 64, lineHeight: 15 },
  scheduleDot: { width: 8, height: 8, borderRadius: 4 },
  scheduleInfo: { flex: 1, gap: 2 },
  scheduleClass: { fontSize: 14, fontWeight: '700' },
  scheduleSubject: { fontSize: 12 },
  roomChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  roomText: { fontSize: 11, fontWeight: '500' },

  announceRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  announceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  announceBody: { flex: 1, gap: 4 },
  announceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  announceTitle: { fontSize: 14, fontWeight: '700' },
  announceText: { fontSize: 12, lineHeight: 17 },
  announceDate: { fontSize: 11 },
});
