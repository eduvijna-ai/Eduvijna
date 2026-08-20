/**
 * My Attendance tab — mock "Mark My Attendance" (check in / check out).
 * Saves via staffAttendanceApi bulkUpsert: Check In = 1H present, Check Out = 2H present.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  Avatar,
  SurfaceCard,
  PrimaryButton,
  Badge,
  EmptyState,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherStaffProfile } from '../../../hooks/useTeacherStaffProfile';
import {
  useTeacherMyAttendance,
  type StaffAttRecord,
} from '../../../hooks/useTeacherMyAttendance';

type Punch = 'check-in' | 'check-out';

function parseYmd(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDayHeading(d: Date): { dateLine: string; weekday: string } {
  return {
    dateLine: `Today, ${d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`,
    weekday: d.toLocaleDateString('en-IN', { weekday: 'long' }),
  };
}

function formatLastPunch(rec: StaffAttRecord | undefined, todayStr: string): string {
  if (!rec) return 'No check-in recorded yet';
  const d = parseYmd(rec.date);
  const when = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const prefix = rec.date === todayStr ? 'Today' : rec.date === prevYmd(todayStr) ? 'Yesterday' : when;
  const half =
    rec.firstHalf === 'present' && rec.secondHalf === 'present'
      ? 'Full day'
      : rec.firstHalf === 'present'
        ? '1st half'
        : 'Recorded';
  return `${prefix}, ${when} · ${half}`;
}

function prevYmd(todayStr: string): string {
  const d = parseYmd(todayStr);
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MyAttendanceHome() {
  const theme = useTeacherTheme();
  const navigation = useNavigation<{ navigate: (name: string) => void }>();
  const { profile } = useTeacherStaffProfile();
  const m = useTeacherMyAttendance();

  const [punch, setPunch] = useState<Punch>('check-in');
  const [now, setNow] = useState(() => new Date());
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    m.setViewPeriod('month');
  }, [m.setViewPeriod]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const todayRec = m.recordMap[m.todayStr];
  const checkedIn = todayRec?.firstHalf === 'present';
  const checkedOut = checkedIn && todayRec?.secondHalf === 'present';

  useEffect(() => {
    if (checkedOut || checkedIn) setPunch(checkedOut ? 'check-out' : 'check-out');
    else setPunch('check-in');
  }, [checkedIn, checkedOut]);

  const lastRec = useMemo(() => {
    const withIn = [...m.records]
      .filter((r) => r.firstHalf === 'present')
      .sort((a, b) => b.date.localeCompare(a.date));
    return withIn[0];
  }, [m.records]);

  const monthOverview = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;
    m.records.forEach((r) => {
      const st = (r.status || '').toLowerCase();
      const lateNote = /late/i.test(r.remarks || '') || st === 'late';
      if (st === 'half_day' || st === 'half-day') halfDay += 1;
      else if (st === 'absent' || st === 'leave') absent += 1;
      else if (lateNote) late += 1;
      else if (st === 'present') present += 1;
      else {
        const fh = r.firstHalf === 'present';
        const sh = r.secondHalf === 'present';
        if (fh && sh) {
          if (lateNote) late += 1;
          else present += 1;
        } else if (fh || sh) halfDay += 1;
        else absent += 1;
      }
    });
    return { present, absent, late, halfDay };
  }, [m.records]);

  const heading = formatDayHeading(now);
  const timeLabel = now.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const roleLine =
    profile.subjects?.[0] && !/teacher/i.test(profile.role)
      ? `${profile.subjects[0]} Teacher`
      : profile.role || 'Instructor';

  const cta = checkedOut
    ? { label: 'Marked for today', disabled: true }
    : punch === 'check-out'
      ? { label: m.saving ? 'Submitting…' : 'Check Out Now', disabled: m.saving || !checkedIn }
      : { label: m.saving ? 'Submitting…' : 'Check In Now', disabled: m.saving || checkedIn };

  const onSubmit = async () => {
    if (checkedOut) return;
    const doingOut = punch === 'check-out';
    if (doingOut && !checkedIn) {
      Alert.alert('Check in first', 'Mark Check In before Check Out.');
      return;
    }
    if (!doingOut && checkedIn) {
      Alert.alert('Already checked in', 'Use Check Out when you leave school.');
      return;
    }
    const first: 'present' | 'absent' = 'present';
    const second: 'present' | 'absent' = doingOut ? 'present' : 'absent';
    const ok = await m.submitForDate(m.todayStr, first, second);
    if (ok) {
      Alert.alert(
        'Submitted',
        doingOut
          ? 'Check-out submitted for approval.'
          : 'Check-in submitted for approval.',
      );
    } else {
      Alert.alert('Submit failed', m.selfMsg || m.error || 'Could not submit attendance.');
    }
  };

  const openCalendar = () => {
    // Walk parents until we hit TeacherStack / AdminStack (owns AttendanceCalendar).
    let nav: { navigate: (name: string) => void; getState?: () => { routeNames?: string[] }; getParent?: () => unknown } | undefined =
      navigation as never;
    for (let i = 0; i < 5 && nav; i += 1) {
      const names = nav.getState?.()?.routeNames;
      if (names?.includes('AttendanceCalendar')) {
        nav.navigate('AttendanceCalendar');
        return;
      }
      nav = nav.getParent?.() as typeof nav;
    }
    (navigation as { navigate: (name: string) => void }).navigate('AttendanceCalendar');
  };

  return (
    <View style={styles.wrap}>
      <View>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Mark My Attendance</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Track your attendance and punctuality
        </Text>
      </View>

      <View style={[styles.hero, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.card }]}>
        <View style={styles.heroTop}>
          <Avatar name={profile.name} uri={profile.avatarUrl} size={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.heroName} numberOfLines={1}>
              {profile.name}
            </Text>
            <View style={styles.heroRoleRow}>
              <Text style={styles.heroRole} numberOfLines={1}>
                {roleLine}
              </Text>
              {profile.employeeId && profile.employeeId !== '—' ? (
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeText}>{profile.employeeId}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.heroMeta}>
          <View style={styles.heroMetaCol}>
            <View style={styles.heroMetaLabelRow}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroMetaLabel}>{heading.dateLine}</Text>
            </View>
            <Text style={styles.heroMetaValue}>{heading.weekday}</Text>
          </View>
          <View style={[styles.heroDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
          <View style={styles.heroMetaCol}>
            <View style={styles.heroMetaLabelRow}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroMetaLabel}>Current Time</Text>
            </View>
            <Text style={styles.heroMetaValue}>{timeLabel}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Mark Attendance</Text>
      <View style={styles.punchRow}>
        <TouchableOpacity
          style={[
            styles.punchCard,
            {
              borderColor:
                punch === 'check-in' ? theme.colors.success : theme.colors.border,
              backgroundColor:
                punch === 'check-in' ? theme.colors.tintGreen : theme.colors.surface,
            },
          ]}
          onPress={() => setPunch('check-in')}
        >
          <View style={[styles.punchIcon, { backgroundColor: theme.colors.success }]}>
            <Ionicons name="checkmark" size={22} color="#FFF" />
          </View>
          <Text style={[styles.punchTitle, { color: theme.colors.textPrimary }]}>Check In</Text>
          <Text style={[styles.punchSub, { color: theme.colors.textSecondary }]}>
            {checkedIn ? 'Checked in today' : 'I am reporting to school.'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.punchCard,
            {
              borderColor:
                punch === 'check-out' ? theme.colors.primary : theme.colors.border,
              backgroundColor:
                punch === 'check-out' ? theme.colors.tintTeal : theme.colors.surface,
              opacity: checkedIn ? 1 : 0.7,
            },
          ]}
          onPress={() => setPunch('check-out')}
        >
          <View
            style={[
              styles.punchIcon,
              { backgroundColor: checkedIn ? theme.colors.primary : theme.colors.surfaceAlt },
            ]}
          >
            <Ionicons
              name="exit-outline"
              size={22}
              color={checkedIn ? '#FFF' : theme.colors.textSecondary}
            />
          </View>
          <Text style={[styles.punchTitle, { color: theme.colors.textPrimary }]}>Check Out</Text>
          <Text style={[styles.punchSub, { color: theme.colors.textSecondary }]}>
            {checkedOut ? 'Checked out today' : 'I am leaving from school.'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.lastRow, { backgroundColor: theme.colors.tintGreen }]}
        onPress={() => setHistoryOpen(true)}
      >
        <Ionicons name="shield-checkmark" size={18} color={theme.colors.success} />
        <Text style={[styles.lastText, { color: theme.colors.textPrimary }]} numberOfLines={2}>
          Last Check In: {formatLastPunch(lastRec, m.todayStr)}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      {m.pendingFromAdmin.length > 0 ? (
        <SurfaceCard style={{ gap: 10, backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }}>
          <Text style={{ fontWeight: '800', fontSize: 14, color: '#92400E' }}>
            Admin Modified — Awaiting Approval ({m.pendingFromAdmin.length})
          </Text>
          {m.pendingFromAdmin.map((rec) => (
            <View key={rec.id} style={styles.pendingRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>{rec.date}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  1H {rec.firstHalf === 'present' ? 'P' : 'A'} · 2H{' '}
                  {rec.secondHalf === 'present' ? 'P' : 'A'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => void m.approvePending(rec.id, 'approved')}
                style={[styles.pendingBtn, { backgroundColor: theme.colors.tintGreen }]}
              >
                <Text style={{ color: theme.colors.success, fontWeight: '800', fontSize: 11 }}>
                  Approve
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void m.approvePending(rec.id, 'rejected')}
                style={[styles.pendingBtn, { backgroundColor: theme.colors.tintRed }]}
              >
                <Text style={{ color: theme.colors.danger, fontWeight: '800', fontSize: 11 }}>
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </SurfaceCard>
      ) : null}

      <View style={styles.monthHead}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, marginBottom: 0 }]}>
          This Month Overview
        </Text>
        <TouchableOpacity style={styles.viewCal} onPress={openCalendar}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
          <Text style={[styles.viewCalText, { color: theme.colors.primary }]}>View Calendar</Text>
        </TouchableOpacity>
      </View>

      <SurfaceCard padded={false}>
        {m.status === 'loading' ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 16 }} />
        ) : (
          <View style={styles.statRow}>
            {(
              [
                ['Present', monthOverview.present, 'checkmark-circle', theme.colors.success],
                ['Absent', monthOverview.absent, 'close-circle', theme.colors.danger],
                ['Late', monthOverview.late, 'time', theme.colors.warning],
                ['Half Day', monthOverview.halfDay, 'remove', theme.colors.textSecondary],
              ] as const
            ).map(([label, value, icon, color], idx) => (
              <View
                key={label}
                style={[
                  styles.statCell,
                  idx < 3 && {
                    borderRightWidth: StyleSheet.hairlineWidth,
                    borderRightColor: theme.colors.border,
                  },
                ]}
              >
                <Ionicons name={icon} size={18} color={color} />
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>

      <TouchableOpacity
        style={[styles.policy, { backgroundColor: theme.colors.tintBlue }]}
        onPress={() =>
          Alert.alert(
            'Attendance Policy',
            'Please mark your attendance during school hours. Check In records the first half; Check Out records the second half. Submissions go for approval.',
          )
        }
      >
        <View style={[styles.policyIcon, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.policyTitle, { color: theme.colors.textPrimary }]}>
            Attendance Policy
          </Text>
          <Text style={[styles.policySub, { color: theme.colors.textSecondary }]}>
            Please make sure to mark your attendance during school hours.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      {m.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{m.error}</Text>
      ) : null}
      {m.selfMsg ? (
        <Text
          style={{
            color: m.selfMsg.toLowerCase().includes('submitted')
              ? theme.colors.success
              : theme.colors.danger,
            fontSize: 13,
            fontWeight: '600',
          }}
        >
          {m.selfMsg}
        </Text>
      ) : null}

      <PrimaryButton
        label={cta.label}
        icon="finger-print-outline"
        loading={m.saving}
        disabled={cta.disabled}
        onPress={() => void onSubmit()}
      />
      <Text style={[styles.disclaimer, { color: theme.colors.textSecondary }]}>
        Check In marks 1st half · Check Out marks 2nd half. Submissions need approval.
      </Text>

      <Modal visible={historyOpen} transparent animationType="fade" onRequestClose={() => setHistoryOpen(false)}>
        <Pressable
          style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setHistoryOpen(false)}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sheet }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>Recent records</Text>
            {m.records.length === 0 ? (
              <EmptyState icon="calendar-outline" title="No records" message="No staff attendance this month." />
            ) : (
              m.records.slice(0, 12).map((r) => (
                <View
                  key={r.id}
                  style={[styles.histRow, { borderBottomColor: theme.colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>{r.date}</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                      1H {r.firstHalf === 'present' ? 'P' : 'A'} · 2H{' '}
                      {r.secondHalf === 'present' ? 'P' : 'A'}
                    </Text>
                  </View>
                  <Badge
                    label={r.approvalStatus}
                    accent={
                      r.approvalStatus === 'approved'
                        ? 'green'
                        : r.approvalStatus === 'rejected'
                          ? 'red'
                          : 'orange'
                    }
                  />
                </View>
              ))
            )}
            <PrimaryButton label="Close" variant="outline" onPress={() => setHistoryOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  hero: { padding: 16, gap: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroName: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  heroRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  heroRole: { color: 'rgba(255,255,255,0.9)', fontSize: 13, flexShrink: 1 },
  idBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  idBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  heroMeta: { flexDirection: 'row', alignItems: 'center' },
  heroMetaCol: { flex: 1, gap: 4 },
  heroMetaLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMetaLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  heroMetaValue: { color: '#FFF', fontSize: 15, fontWeight: '700', marginLeft: 20 },
  heroDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  punchRow: { flexDirection: 'row', gap: 10 },
  punchCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    minHeight: 132,
  },
  punchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  punchTitle: { fontSize: 16, fontWeight: '800' },
  punchSub: { fontSize: 12, lineHeight: 16 },
  lastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lastText: { flex: 1, fontSize: 13, fontWeight: '600' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  monthHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewCal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewCalText: { fontSize: 13, fontWeight: '700' },
  statRow: { flexDirection: 'row', paddingVertical: 14 },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  policy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 12,
  },
  policyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyTitle: { fontSize: 14, fontWeight: '700' },
  policySub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  overlay: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  sheet: { padding: 16, gap: 10, marginBottom: 24, maxHeight: '70%' },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
