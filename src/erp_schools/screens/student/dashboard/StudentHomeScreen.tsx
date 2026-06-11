/**
 * Student Home — welcome hero + overlapping identity/stat card, quick access,
 * today's schedule, announcements and the AI Learning Assistant card.
 * Reference: assets/student_screens/student or parent home screen.png
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  SurfaceCard,
  SectionHeader,
  QuickActionGrid,
  Badge,
  StatusPill,
  type QuickAction,
  type PillStatus,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherSession } from '../../../hooks/useTeacherSession';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useStudentData } from '../../../hooks/useStudentData';
import { FONT_FAMILY } from '../../../../theme/fonts';

const HERO_OVERLAP = 64;
const HERO_TOP_RADIUS = 24;

const SCHEDULE_STATUS: Record<string, PillStatus> = {
  completed: 'graded',
  upcoming: 'pending',
  ongoing: 'active',
};

export default function StudentHomeScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const { firstName } = useTeacherSession();
  const { profile, overview, schedule, announcements } = useStudentData();

  const welcomeName = firstName && firstName !== 'Teacher' ? firstName : profile.name.split(' ')[0];

  const stats = [
    { key: 'att', value: `${overview.attendancePercent}%`, label: 'Attendance' },
    { key: 'marks', value: `${overview.averageMarks}%`, label: 'Avg Marks' },
    { key: 'rank', value: `#${overview.classRank}`, label: 'Class Rank' },
  ];

  const actions: QuickAction[] = [
    { key: 'attendance', icon: 'calendar-outline', label: 'Attendance', accent: 'teal', onPress: () => navigation.navigate('Attendance') },
    { key: 'assignments', icon: 'document-text-outline', label: 'Assignments', accent: 'blue', onPress: () => navigation.navigate('Assignments') },
    { key: 'marks', icon: 'bar-chart-outline', label: 'Marks', accent: 'green', onPress: () => navigation.navigate('StudentTabs', { screen: 'StudentAcademics' }) },
    { key: 'timetable', icon: 'time-outline', label: 'Timetable', accent: 'orange', onPress: () => navigation.navigate('Timetable') },
    { key: 'fees', icon: 'wallet-outline', label: 'Fee Details', accent: 'purple', onPress: () => navigation.navigate('FeeDashboard') },
    { key: 'notices', icon: 'megaphone-outline', label: 'Notices', accent: 'pink', onPress: () => navigation.navigate('Notices') },
    { key: 'events', icon: 'calendar-number-outline', label: 'Events', accent: 'red', onPress: () => navigation.navigate('Events') },
    { key: 'library', icon: 'book-outline', label: 'Library', accent: 'teal', onPress: () => navigation.navigate('Library') },
  ];

  return (
    <TeacherScreen contentStyle={styles.scrollContent}>
      <View
        style={[
          styles.heroClip,
          { borderTopLeftRadius: HERO_TOP_RADIUS, borderTopRightRadius: HERO_TOP_RADIUS, backgroundColor: theme.colors.primary },
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
              <Text style={styles.heroGreetingLead}>Hello, </Text>
              <Text style={styles.heroGreetingName}>{welcomeName}</Text>
              <Text style={styles.heroGreetingLead}> 👋</Text>
            </Text>
            <Text style={styles.heroSub}>Let&apos;s keep learning and grow today!</Text>
          </View>
        </View>
      </View>

      {/* Identity + stats card — overlaps hero */}
      <View style={styles.cardWrap}>
        <SurfaceCard style={[styles.identityCard, theme.shadow.medium]}>
          <View style={styles.identityRow}>
            <View style={[styles.idAvatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.idAvatarText}>AK</Text>
            </View>
            <View style={styles.identityInfo}>
              <Text style={[styles.identityName, { color: theme.colors.textPrimary }]}>{profile.name}</Text>
              <Text style={[styles.identityMeta, { color: theme.colors.textSecondary }]}>{profile.className}</Text>
              <View style={[styles.rollChip, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Text style={[styles.rollChipText, { color: theme.colors.textSecondary }]}>Roll No. {profile.rollNo}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.profileBtn, { borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('StudentProfile')}
              accessibilityRole="button"
              accessibilityLabel="View Profile"
            >
              <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.profileBtnText, { color: theme.colors.textSecondary }]}>View Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.statsRow, { borderTopColor: theme.colors.border }]}>
            {stats.map((stat, index) => (
              <React.Fragment key={stat.key}>
                {index > 0 ? <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} /> : null}
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: theme.colors.primary }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{stat.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          <View style={[styles.progressBanner, { backgroundColor: theme.colors.tintGreen }]}>
            <Ionicons name="star" size={16} color={theme.colors.warning} />
            <Text style={[styles.progressTitle, { color: theme.colors.success }]}>Good Progress</Text>
            <Text style={[styles.progressSub, { color: theme.colors.textSecondary }]}>Keep it up!</Text>
          </View>
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Quick Access" actionLabel="View All" onAction={() => navigation.navigate('StudentTabs', { screen: 'StudentMore' })} />
        <QuickActionGrid actions={actions} columns={4} />
      </View>

      <SurfaceCard style={styles.section}>
        <SectionHeader title="Today's Schedule" icon="calendar-outline" actionLabel="View Timetable" onAction={() => navigation.navigate('Timetable')} />
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
              <Text style={[styles.scheduleSubject, { color: theme.colors.textPrimary }]}>{period.subject}</Text>
              <Text style={[styles.scheduleMeta, { color: theme.colors.textSecondary }]}>{period.room} • {period.teacher}</Text>
            </View>
            <StatusPill status={SCHEDULE_STATUS[period.status]} label={period.status === 'completed' ? 'Completed' : period.status === 'ongoing' ? 'Ongoing' : 'Upcoming'} />
          </View>
        ))}
      </SurfaceCard>

      <SurfaceCard style={styles.section}>
        <SectionHeader title="Recent Announcements" icon="megaphone-outline" actionLabel="View All" onAction={() => navigation.navigate('Notices')} />
        {announcements.map((item) => (
          <View key={item.id} style={styles.announceRow}>
            <View style={[styles.announceIcon, { backgroundColor: theme.colors.tintTeal }]}>
              <Ionicons name="megaphone-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.announceBody}>
              <View style={styles.announceTitleRow}>
                {item.isNew ? <Badge label="NEW" accent="green" /> : null}
                <Text style={[styles.announceTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text>
              </View>
              <Text style={[styles.announceText, { color: theme.colors.textSecondary }]} numberOfLines={2}>{item.body}</Text>
            </View>
            <Text style={[styles.announceDate, { color: theme.colors.textSecondary }]}>{item.date}</Text>
          </View>
        ))}
      </SurfaceCard>

      <View style={styles.section}>
        <SurfaceCard style={{ backgroundColor: theme.colors.tintTeal }} onPress={() => navigation.navigate('AITutor')}>
          <View style={styles.aiRow}>
            <View style={[styles.aiIcon, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.aiBody}>
              <View style={styles.announceTitleRow}>
                <Text style={[styles.aiTitle, { color: theme.colors.textPrimary }]}>AI Learning Assistant</Text>
                <Badge label="NEW" accent="green" />
              </View>
              <Text style={[styles.aiSub, { color: theme.colors.textSecondary }]}>Get instant help with any subject</Text>
            </View>
            <View style={[styles.askBtn, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.askBtnText}>Ask Now</Text>
            </View>
          </View>
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 0, paddingTop: 0 },

  heroClip: { width: '100%', overflow: 'hidden' },
  hero: { width: '100%', minHeight: 120, paddingBottom: HERO_OVERLAP + 16, position: 'relative' },
  heroWatermark: { position: 'absolute', right: -32, top: -16, width: 220, height: 220, opacity: 0.12 },
  heroTextWrap: { paddingHorizontal: 20, paddingTop: 18, paddingRight: 100 },
  heroGreeting: { color: '#FFFFFF', fontSize: 23, lineHeight: 30 },
  heroGreetingLead: { fontFamily: FONT_FAMILY.medium, fontWeight: '500' },
  heroGreetingName: { fontFamily: FONT_FAMILY.bold, fontWeight: '700' },
  heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '400', marginTop: 6, lineHeight: 18 },

  cardWrap: { marginTop: -HERO_OVERLAP, paddingHorizontal: 16, zIndex: 2, elevation: 4, marginBottom: 4 },
  identityCard: { borderRadius: 16, elevation: 3 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14 },
  idAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  idAvatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  identityInfo: { flex: 1, gap: 2 },
  identityName: { fontSize: 16, fontWeight: '700' },
  identityMeta: { fontSize: 13 },
  rollChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  rollChipText: { fontSize: 11, fontWeight: '600' },
  profileBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  profileBtnText: { fontSize: 11, fontWeight: '600' },

  statsRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 2 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, textAlign: 'center' },
  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  progressTitle: { fontSize: 13, fontWeight: '700' },
  progressSub: { fontSize: 12 },

  section: { marginTop: 16, marginHorizontal: 16 },

  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  scheduleTime: { fontSize: 11, width: 64, lineHeight: 15 },
  scheduleDot: { width: 8, height: 8, borderRadius: 4 },
  scheduleInfo: { flex: 1, gap: 2 },
  scheduleSubject: { fontSize: 14, fontWeight: '700' },
  scheduleMeta: { fontSize: 12 },

  announceRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  announceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  announceBody: { flex: 1, gap: 4 },
  announceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  announceTitle: { fontSize: 14, fontWeight: '700' },
  announceText: { fontSize: 12, lineHeight: 17 },
  announceDate: { fontSize: 11 },

  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  aiBody: { flex: 1, gap: 2 },
  aiTitle: { fontSize: 14, fontWeight: '700' },
  aiSub: { fontSize: 12 },
  askBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  askBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
