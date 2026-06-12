/**
 * Admin Home — operational command center: welcome hero + overlapping school
 * overview card, today's alerts, quick actions, live attendance + fee collection,
 * AI insights, pending approvals, upcoming events and an AI assistant CTA.
 * Reference: assets/admin_screens/admin home screen.png
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  QuickActionGrid,
  DonutChart,
  type QuickAction,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherSession } from '../../../hooks/useTeacherSession';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useAdminData } from '../../../hooks/useAdminData';
import { accentColors } from '../../../theme/accents';
import { FONT_FAMILY } from '../../../../theme/fonts';

const HERO_OVERLAP = 72;
const HERO_TOP_RADIUS = 24;

export default function AdminHomeScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const { firstName } = useTeacherSession();
  const { profile, dashboard } = useAdminData();

  const welcomeName = firstName && firstName !== 'Teacher' ? firstName : profile.name.split(' ')[0];
  const fee = dashboard.feeCollection;

  const actions: QuickAction[] = [
    { key: 'students', icon: 'school-outline', label: 'Students', accent: 'teal', onPress: () => navigation.navigate('StudentManagement') },
    { key: 'teachers', icon: 'person-outline', label: 'Teachers', accent: 'blue', onPress: () => navigation.navigate('TeacherManagement') },
    { key: 'classes', icon: 'easel-outline', label: 'Classes', accent: 'purple', onPress: () => navigation.navigate('Classes') },
    { key: 'exams', icon: 'clipboard-outline', label: 'Exams', accent: 'orange', onPress: () => navigation.navigate('Exams') },
    { key: 'fees', icon: 'wallet-outline', label: 'Fees', accent: 'green', onPress: () => navigation.navigate('FeeCollection') },
    { key: 'announce', icon: 'megaphone-outline', label: 'Announcements', accent: 'pink', onPress: () => navigation.navigate('Announcements') },
    { key: 'reports', icon: 'bar-chart-outline', label: 'Reports', accent: 'red', onPress: () => navigation.navigate('ReportsDashboard') },
    { key: 'settings', icon: 'settings-outline', label: 'Settings', accent: 'teal', onPress: () => navigation.navigate('AdminSettings') },
  ];

  const alertRoute = (id: string) => {
    switch (id) {
      case 'al1':
        return () => navigation.navigate('TeacherManagement');
      case 'al2':
        return () => navigation.navigate('AttendanceDashboard');
      case 'al3':
        return () => navigation.navigate('FeeCollection');
      default:
        return () => navigation.navigate('ApprovalWorkflow');
    }
  };

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
              <Text style={styles.heroGreetingLead}>Good Morning, </Text>
              <Text style={styles.heroGreetingName}>{welcomeName}</Text>
              <Text style={styles.heroGreetingLead}> 👋</Text>
            </Text>
            <Text style={styles.heroSub}>{profile.schoolName} · AY {profile.academicYear}</Text>
          </View>
        </View>
      </View>

      {/* School overview card — overlaps hero */}
      <View style={styles.cardWrap}>
        <SurfaceCard style={[styles.overviewCard, theme.shadow.medium]}>
          <View style={styles.overviewHeader}>
            <View style={styles.overviewTitleRow}>
              <Ionicons name="business-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.overviewTitle, { color: theme.colors.textPrimary }]}>School Overview</Text>
            </View>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => navigation.navigate('SchoolOverview')}
              accessibilityRole="button"
              accessibilityLabel="View Full Report"
            >
              <Text style={[styles.linkText, { color: theme.colors.primary }]}>View Full Report</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <StatGrid items={dashboard.kpis} columns={2} variant="tinted" />

          <View style={[styles.secondaryRow, { borderTopColor: theme.colors.border }]}>
            {dashboard.secondaryKpis.map((kpi, index) => (
              <React.Fragment key={kpi.key}>
                {index > 0 ? <View style={[styles.secondaryDivider, { backgroundColor: theme.colors.border }]} /> : null}
                <View style={styles.secondary}>
                  <Text style={[styles.secondaryValue, { color: theme.colors.primary }]}>{kpi.value}</Text>
                  <Text style={[styles.secondaryLabel, { color: theme.colors.textSecondary }]} numberOfLines={2}>{kpi.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </SurfaceCard>
      </View>

      {/* Today's alerts */}
      <View style={styles.section}>
        <SectionHeader title="Today's Alerts" actionLabel="View All" onAction={() => navigation.navigate('AttendanceDashboard')} />
        <View style={styles.alertGrid}>
          {dashboard.alerts.map((alert) => {
            const accent = accentColors(theme.colors, alert.accent);
            return (
              <TouchableOpacity
                key={alert.id}
                style={[styles.alertCard, theme.shadow.light, { backgroundColor: accent.bg, borderColor: theme.colors.border }]}
                onPress={alertRoute(alert.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${alert.count} ${alert.label}`}
              >
                <View style={styles.alertTop}>
                  <Ionicons name={alert.icon} size={20} color={accent.fg} />
                  <View style={[styles.alertDot, { backgroundColor: theme.colors.danger }]} />
                </View>
                <Text style={[styles.alertCount, { color: theme.colors.textPrimary }]}>{alert.count}</Text>
                <Text style={[styles.alertLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>{alert.label}</Text>
                <Text style={[styles.alertLink, { color: accent.fg }]}>View Details ›</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <SectionHeader title="Quick Actions" actionLabel="More" onAction={() => navigation.navigate('AdminTabs', { screen: 'AdminMore' })} />
        <QuickActionGrid actions={actions} columns={4} />
      </View>

      {/* Live attendance + fee collection */}
      <View style={[styles.section, styles.twoCol]}>
        <SurfaceCard style={styles.flex1}>
          <SectionHeader title="Live Attendance" />
          {dashboard.attendancePulses.map((pulse) => (
            <View key={pulse.label} style={styles.pulseRow}>
              <DonutChart
                segments={[
                  { value: pulse.percent, color: accentColors(theme.colors, pulse.accent).fg },
                  { value: 100 - pulse.percent, color: theme.colors.surfaceAlt },
                ]}
                size={56}
                strokeWidth={8}
              />
              <View>
                <Text style={[styles.pulseLabel, { color: theme.colors.textSecondary }]}>{pulse.label}</Text>
                <Text style={[styles.pulseValue, { color: theme.colors.textPrimary }]}>{pulse.percent}%</Text>
                <Text style={[styles.pulseSub, { color: theme.colors.textSecondary }]}>Present</Text>
              </View>
            </View>
          ))}
        </SurfaceCard>

        <SurfaceCard style={styles.flex1}>
          <SectionHeader title="Fee Collection" />
          <View style={styles.feeDonutWrap}>
            <DonutChart
              segments={[
                { value: fee.collected, color: theme.colors.success },
                { value: fee.pending, color: theme.colors.warning },
                { value: fee.overdue, color: theme.colors.danger },
              ]}
              size={104}
              strokeWidth={14}
              centerValue={fee.totalLabel}
              centerLabel="Total"
            />
          </View>
          <View style={styles.feeLegend}>
            <FeeLegendRow color={theme.colors.success} label="Collected" value="₹12.5L" />
            <FeeLegendRow color={theme.colors.warning} label="Pending" value="₹2.1L" />
            <FeeLegendRow color={theme.colors.danger} label="Overdue" value="₹65K" />
          </View>
        </SurfaceCard>
      </View>

      {/* AI insights */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="AI Insights" icon="sparkles-outline" actionLabel="Full Analysis" onAction={() => navigation.navigate('ReportsDashboard')} />
        {dashboard.insights.map((insight, index) => {
          const accent = accentColors(theme.colors, insight.accent);
          return (
            <View
              key={insight.id}
              style={[
                styles.insightRow,
                index < dashboard.insights.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <View style={[styles.insightIcon, { backgroundColor: accent.bg }]}>
                <Ionicons name={insight.icon} size={16} color={accent.fg} />
              </View>
              <Text style={[styles.insightText, { color: theme.colors.textPrimary }]}>{insight.text}</Text>
            </View>
          );
        })}
      </SurfaceCard>

      {/* Pending approvals */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Pending Approvals" icon="checkmark-done-outline" actionLabel="View All" onAction={() => navigation.navigate('ApprovalWorkflow')} />
        {dashboard.approvals.map((approval, index) => {
          const accent = accentColors(theme.colors, approval.accent);
          return (
            <TouchableOpacity
              key={approval.id}
              style={[
                styles.approvalRow,
                index < dashboard.approvals.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
              onPress={() => navigation.navigate('ApprovalWorkflow')}
              accessibilityRole="button"
              accessibilityLabel={approval.label}
            >
              <View style={[styles.approvalIcon, { backgroundColor: accent.bg }]}>
                <Ionicons name={approval.icon} size={16} color={accent.fg} />
              </View>
              <Text style={[styles.approvalLabel, { color: theme.colors.textPrimary }]} numberOfLines={1}>{approval.label}</Text>
              <View style={[styles.approvalBadge, { backgroundColor: theme.colors.tintTeal }]}>
                <Text style={[styles.approvalBadgeText, { color: theme.colors.primary }]}>{approval.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </SurfaceCard>

      {/* Upcoming events */}
      <SurfaceCard style={styles.section}>
        <SectionHeader title="Upcoming Events" icon="calendar-outline" actionLabel="Calendar" onAction={() => navigation.navigate('Announcements')} />
        {dashboard.events.map((event, index) => (
          <View
            key={event.id}
            style={[
              styles.eventRow,
              index < dashboard.events.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <View style={[styles.eventDate, { backgroundColor: theme.colors.tintTeal }]}>
              <Text style={[styles.eventDay, { color: theme.colors.primary }]}>{event.day}</Text>
              <Text style={[styles.eventMonth, { color: theme.colors.primary }]}>{event.month}</Text>
            </View>
            <View style={styles.eventInfo}>
              <Text style={[styles.eventTitle, { color: theme.colors.textPrimary }]}>{event.title}</Text>
              <Text style={[styles.eventMeta, { color: theme.colors.textSecondary }]}>{event.meta}</Text>
            </View>
          </View>
        ))}
      </SurfaceCard>

      {/* AI assistant CTA */}
      <View style={styles.section}>
        <SurfaceCard style={{ backgroundColor: theme.colors.primary }}>
          <View style={styles.aiRow}>
            <View style={styles.aiIcon}>
              <Ionicons name="sparkles" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.aiBody}>
              <Text style={styles.aiTitle}>EduVijna AI Assistant</Text>
              <Text style={styles.aiSub}>Get insights and automate school operations.</Text>
            </View>
            <View style={styles.askBtn}>
              <Text style={[styles.askBtnText, { color: theme.colors.primary }]}>Ask AI</Text>
            </View>
          </View>
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

function FeeLegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.legendValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 0, paddingTop: 0 },

  heroClip: { width: '100%', overflow: 'hidden' },
  hero: { width: '100%', minHeight: 132, paddingBottom: HERO_OVERLAP + 20, position: 'relative' },
  heroWatermark: { position: 'absolute', right: -32, top: -16, width: 240, height: 240, opacity: 0.12 },
  heroTextWrap: { paddingHorizontal: 20, paddingTop: 20, paddingRight: 100 },
  heroGreeting: { color: '#FFFFFF', fontSize: 24, lineHeight: 30 },
  heroGreetingLead: { fontFamily: FONT_FAMILY.medium, fontWeight: '500' },
  heroGreetingName: { fontFamily: FONT_FAMILY.bold, fontWeight: '700' },
  heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '400', marginTop: 8, lineHeight: 18 },

  cardWrap: { marginTop: -HERO_OVERLAP, paddingHorizontal: 16, zIndex: 2, elevation: 4, marginBottom: 4 },
  overviewCard: { borderRadius: 16, elevation: 3 },
  overviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  overviewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overviewTitle: { fontSize: 16, fontWeight: '700' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { fontSize: 12, fontWeight: '600' },

  secondaryRow: { flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 14 },
  secondary: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 2 },
  secondaryDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 2 },
  secondaryValue: { fontSize: 17, fontWeight: '800' },
  secondaryLabel: { fontSize: 10, textAlign: 'center', lineHeight: 13 },

  section: { marginTop: 16, marginHorizontal: 16 },
  twoCol: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },

  alertGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  alertCard: { width: '48%', padding: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  alertTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  alertCount: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  alertLabel: { fontSize: 12 },
  alertLink: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  pulseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  pulseLabel: { fontSize: 11 },
  pulseValue: { fontSize: 18, fontWeight: '800' },
  pulseSub: { fontSize: 10 },

  feeDonutWrap: { alignItems: 'center', paddingVertical: 4 },
  feeLegend: { marginTop: 10, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, flex: 1 },
  legendValue: { fontSize: 11, fontWeight: '700' },

  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  insightIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  insightText: { flex: 1, fontSize: 13, lineHeight: 18 },

  approvalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  approvalIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  approvalLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  approvalBadge: { minWidth: 26, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  approvalBadgeText: { fontSize: 12, fontWeight: '700' },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  eventDate: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventDay: { fontSize: 16, fontWeight: '800' },
  eventMonth: { fontSize: 10, fontWeight: '600' },
  eventInfo: { flex: 1, gap: 2 },
  eventTitle: { fontSize: 14, fontWeight: '700' },
  eventMeta: { fontSize: 12 },

  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  aiBody: { flex: 1, gap: 2 },
  aiTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  aiSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  askBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  askBtnText: { fontSize: 12, fontWeight: '700' },
});
