/**
 * Teacher student mark sheet — mobile UX (mock: Mark Attendance).
 * Same APIs as the web tracker; one calendar date at a time.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  ClassContextBanner,
  SurfaceCard,
  SearchBar,
  SelectField,
  PrimaryButton,
  Avatar,
  EmptyState,
  InfoBanner,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import {
  useTeacherAttendanceTracker,
  type AttStatus,
} from '../../../hooks/useTeacherAttendanceTracker';
import { useTeacherTimetable, fmtSlotTime } from '../../../hooks/useTeacherTimetable';
import { toLocalDateStr } from '../../../utils/apiHelpers';

const MARK_STATUSES: Array<{
  key: Exclude<AttStatus, ''>;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'present', label: 'Present', icon: 'checkmark-circle' },
  { key: 'absent', label: 'Absent', icon: 'close-circle' },
  { key: 'late', label: 'Late', icon: 'time' },
  { key: 'leave', label: 'Leave', icon: 'remove' },
];

function parseYmd(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatMarkDateLabel(ymd: string, todayStr: string): string {
  const d = parseYmd(ymd);
  const datePart = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (ymd === todayStr) return `Today, ${datePart}`;
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type SheetProps = {
  initialClassId?: string | number;
  /** Hub already provides TeacherScreen chrome. */
  embedded?: boolean;
  showBack?: boolean;
};

export default function StudentMarkSheet({
  initialClassId,
  embedded = false,
  showBack = true,
}: SheetProps) {
  const theme = useTeacherTheme();
  const t = useTeacherAttendanceTracker(initialClassId, { allowPastDates: true });
  const timetable = useTeacherTimetable();
  const slots = Array.isArray(timetable.slots) ? timetable.slots : [];

  const [pickingDate, setPickingDate] = useState(false);
  const [iosDraft, setIosDraft] = useState<Date | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [markAllOpen, setMarkAllOpen] = useState(false);
  const [statusFor, setStatusFor] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const classMeta = useMemo(() => {
    const cls = t.classOptions.find((c) => c.id === t.classId);
    const sub = t.subjectOptions.find((s) => s.id === t.subjectId);
    const section = t.sectionOptions.find((s) => s.id === t.sectionId);
    const code = [cls?.name, section?.name].filter(Boolean).join('-') || cls?.name || 'Class';
    const title = cls?.name
      ? cls.name.toLowerCase().startsWith('class')
        ? cls.name
        : `Class ${cls.name}${section?.name ? `-${section.name}` : ''}`
      : 'Class';
    return {
      code,
      title,
      subject: sub?.name || (t.subjectId ? 'Subject' : 'Select subject'),
    };
  }, [t.classOptions, t.classId, t.subjectOptions, t.subjectId, t.sectionOptions, t.sectionId]);

  const periodMeta = useMemo(() => {
    if (!t.classId || !t.selectedDate) return { timeLabel: undefined as string | undefined, room: '' };
    const d = parseYmd(t.selectedDate);
    const dow = (d.getDay() + 6) % 7; // Mon=0
    const className = (t.classOptions.find((c) => c.id === t.classId)?.name || '').toLowerCase();
    const subjectName = (
      t.subjectOptions.find((s) => s.id === t.subjectId)?.name || ''
    ).toLowerCase();
    const daySlots = slots.filter((s) => s.dayOfWeek === dow);
    const match =
      daySlots.find((s) => {
        const sn = `${s.className} ${s.sectionName}`.toLowerCase();
        const classOk =
          !className ||
          sn.includes(className) ||
          className.includes((s.className || '').toLowerCase());
        const subOk =
          !subjectName ||
          (s.subjectName || '').toLowerCase() === subjectName ||
          (s.subjectName || '').toLowerCase().includes(subjectName);
        return classOk && subOk;
      }) ||
      daySlots.find((s) => {
        const sn = `${s.className} ${s.sectionName}`.toLowerCase();
        return (
          className &&
          (sn.includes(className) || className.includes((s.className || '').toLowerCase()))
        );
      });
    if (!match) return { timeLabel: undefined as string | undefined, room: '' };
    const start = fmtSlotTime(match.startTime);
    const end = fmtSlotTime(match.endTime);
    const timeLabel =
      start !== '—' && end !== '—' ? `${start} – ${end}` : start !== '—' ? start : undefined;
    return { timeLabel, room: match.room || '' };
  }, [slots, t.classId, t.classOptions, t.selectedDate, t.subjectId, t.subjectOptions]);

  const day = t.dayCounts[t.selectedDate] || {
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    marked: 0,
  };
  const editable = !t.isViewOnly && t.canEditDate(t.selectedDate);
  const isFuture = t.selectedDate > t.todayStr;

  const applyDate = (date: Date) => {
    const next = toLocalDateStr(date);
    if (next === t.selectedDate) return;
    const go = () => t.selectMarkDate(next);
    if (!t.hasEdits) {
      go();
      return;
    }
    Alert.alert(
      'Unsaved changes',
      'Save attendance for the current date before switching, or discard those marks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard and switch',
          style: 'destructive',
          onPress: () => {
            t.clearEdits();
            go();
          },
        },
      ],
    );
  };

  const onSave = async () => {
    const ok = await t.saveChanges();
    if (ok) Alert.alert('Saved', `Attendance saved for ${formatMarkDateLabel(t.selectedDate, t.todayStr)}.`);
    else Alert.alert('Save failed', t.error || 'Could not save attendance.');
  };

  const statusColors = (st: AttStatus) => {
    switch (st) {
      case 'present':
        return { bg: theme.colors.tintGreen, fg: theme.colors.onTintGreen };
      case 'absent':
        return { bg: theme.colors.tintRed, fg: theme.colors.onTintRed };
      case 'late':
        return { bg: theme.colors.tintOrange, fg: theme.colors.onTintOrange };
      case 'leave':
        return { bg: theme.colors.surfaceAlt, fg: theme.colors.textSecondary };
      default:
        return { bg: theme.colors.surfaceAlt, fg: theme.colors.textSecondary };
    }
  };

  const body = (
    <View style={styles.body}>
      <ClassContextBanner
        code={classMeta.code}
        name={classMeta.title}
        subject={classMeta.subject}
        room={periodMeta.room}
        timeLabel={periodMeta.timeLabel}
        badgeIcon="calendar-outline"
      />

      <View style={styles.dateRow}>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => {
            setIosDraft(parseYmd(t.selectedDate));
            setPickingDate(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Change attendance date"
        >
          <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.dateLabel, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {formatMarkDateLabel(t.selectedDate, t.todayStr)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.totalWrap}>
          <Text style={[styles.totalCaption, { color: theme.colors.textSecondary }]}>
            Total Students
          </Text>
          <View style={[styles.totalBadge, { backgroundColor: theme.colors.tintTeal }]}>
            <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
              {t.roster.length}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.statsRow, { borderColor: theme.colors.border }]}>
        {(
          [
            ['present', day.present, 'Present', 'checkmark-circle', theme.colors.success],
            ['absent', day.absent, 'Absent', 'close-circle', theme.colors.danger],
            ['late', day.late, 'Late', 'time', theme.colors.warning],
            ['leave', day.leave, 'Leave', 'remove', theme.colors.textSecondary],
          ] as const
        ).map(([key, value, label, icon, color], idx) => (
          <View
            key={key}
            style={[
              styles.statCell,
              idx < 3 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.colors.border },
            ]}
          >
            <Ionicons name={icon} size={18} color={color} />
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.toolsRow}>
        <View style={{ flex: 1 }}>
          <SearchBar value={t.query} onChangeText={t.setQuery} placeholder="Search students..." />
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          onPress={() => setFilterOpen(true)}
          accessibilityLabel="Filters"
        >
          <Ionicons name="filter-outline" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.markAllBtn,
            { borderColor: theme.colors.success, backgroundColor: theme.colors.surface },
          ]}
          onPress={() => {
            if (!editable) {
              Alert.alert(
                t.isViewOnly ? 'Select a subject' : 'Cannot mark',
                t.isViewOnly
                  ? 'Choose a subject in Filters to mark attendance.'
                  : 'This date cannot be marked.',
              );
              return;
            }
            setMarkAllOpen(true);
          }}
        >
          <Text style={[styles.markAllText, { color: theme.colors.success }]}>Mark All</Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.success} />
        </TouchableOpacity>
      </View>

      {t.isViewOnly ? (
        <InfoBanner
          title="Select a subject"
          text="Open Filters and pick a subject to mark attendance for this date."
        />
      ) : isFuture ? (
        <InfoBanner title="Future date" text="You can only mark attendance up to today." />
      ) : null}

      {t.status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 16 }} />
      ) : null}
      {t.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{t.error}</Text>
      ) : null}

      {t.studentSummaries.length === 0 && t.status !== 'loading' ? (
        <EmptyState
          icon="people-outline"
          title="No students"
          message="Select class and section in Filters to load the roster."
        />
      ) : (
        <SurfaceCard padded={false} style={styles.listCard}>
          <View style={[styles.listHead, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.th, { width: 28, color: theme.colors.textSecondary }]}>#</Text>
            <Text style={[styles.th, { flex: 1, color: theme.colors.textSecondary }]}>
              Student Name
            </Text>
            <Text style={[styles.th, { width: 118, color: theme.colors.textSecondary }]}>
              Status
            </Text>
          </View>
          {t.studentSummaries.map((s, idx) => {
            const st = s.selectedStatus;
            const colors = statusColors(st);
            const meta = MARK_STATUSES.find((x) => x.key === st);
            return (
              <View
                key={s.studentId}
                style={[
                  styles.listRow,
                  {
                    borderBottomWidth:
                      idx < t.studentSummaries.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.idx, { color: theme.colors.textSecondary }]}>{idx + 1}</Text>
                <Avatar name={s.name} uri={s.avatarUrl} size={40} />
                <View style={styles.nameCol}>
                  <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={[styles.adm, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {s.admissionNo}
                  </Text>
                </View>
                <TouchableOpacity
                  disabled={!editable}
                  onPress={() => setStatusFor(s.studentId)}
                  style={[
                    styles.statusBtn,
                    {
                      backgroundColor: colors.bg,
                      borderColor: colors.fg,
                      opacity: editable ? 1 : 0.7,
                    },
                  ]}
                >
                  {meta ? (
                    <Ionicons name={meta.icon} size={14} color={colors.fg} />
                  ) : (
                    <Ionicons name="chevron-down" size={14} color={colors.fg} />
                  )}
                  <Text style={[styles.statusBtnText, { color: colors.fg }]} numberOfLines={1}>
                    {meta?.label ?? 'Mark'}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color={colors.fg} />
                </TouchableOpacity>
              </View>
            );
          })}
        </SurfaceCard>
      )}

      <View style={styles.legend}>
        {MARK_STATUSES.map((s) => {
          const c = statusColors(s.key);
          return (
            <View key={s.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c.fg }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
                {s.label}
              </Text>
            </View>
          );
        })}
      </View>

      {embedded ? (
        <PrimaryButton
          label={t.saving ? 'Saving…' : 'Save Attendance'}
          loading={t.saving}
          disabled={!t.hasEdits || t.saving || !editable}
          onPress={() => void onSave()}
        />
      ) : null}
    </View>
  );

  const pickers = (
    <>
      {pickingDate && Platform.OS === 'android' ? (
        <DateTimePicker
          value={parseYmd(t.selectedDate)}
          mode="date"
          display="calendar"
          maximumDate={new Date()}
          onChange={(_, date) => {
            setPickingDate(false);
            if (date) applyDate(date);
          }}
        />
      ) : null}

      <Modal
        visible={pickingDate && Platform.OS === 'ios'}
        transparent
        animationType="fade"
        onRequestClose={() => setPickingDate(false)}
      >
        <Pressable style={[styles.overlay, { backgroundColor: theme.colors.overlay }]} onPress={() => setPickingDate(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sheet }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
              Select date
            </Text>
            <DateTimePicker
              value={iosDraft || parseYmd(t.selectedDate)}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={(_, date) => {
                if (date) setIosDraft(date);
              }}
            />
            <PrimaryButton
              label="Apply date"
              onPress={() => {
                if (iosDraft) applyDate(iosDraft);
                setPickingDate(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: theme.colors.overlay }]} onPress={() => setFilterOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sheet }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>Filters</Text>
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Class</Text>
            <SelectField
              options={t.classOptions.map((c) => ({ label: c.name, value: String(c.id) }))}
              value={t.classId != null ? String(t.classId) : null}
              onChange={(v) => {
                t.setClassId(Number(v));
                t.setSectionId(undefined);
                t.setSubjectId(undefined);
              }}
              placeholder="Select class"
            />
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Section</Text>
            <SelectField
              options={[
                { label: 'All', value: '' },
                ...t.sectionOptions.map((s) => ({ label: s.name, value: String(s.id) })),
              ]}
              value={t.sectionId != null ? String(t.sectionId) : ''}
              onChange={(v) => t.setSectionId(v ? Number(v) : undefined)}
            />
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Subject (required to mark)
            </Text>
            <SelectField
              options={[
                { label: 'All Subjects (view only)', value: '' },
                ...t.subjectOptions.map((s) => ({ label: s.name, value: String(s.id) })),
              ]}
              value={t.subjectId != null ? String(t.subjectId) : ''}
              onChange={(v) => t.setSubjectId(v ? Number(v) : undefined)}
            />
            <PrimaryButton label="Done" onPress={() => setFilterOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={markAllOpen} transparent animationType="fade" onRequestClose={() => setMarkAllOpen(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: theme.colors.overlay }]} onPress={() => setMarkAllOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sheet }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
              Mark all · {formatMarkDateLabel(t.selectedDate, t.todayStr)}
            </Text>
            {MARK_STATUSES.map((s) => {
              const c = statusColors(s.key);
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.optionRow, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    t.applyBulk(t.selectedDate, s.key);
                    setMarkAllOpen(false);
                  }}
                >
                  <Ionicons name={s.icon} size={18} color={c.fg} />
                  <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={statusFor != null} transparent animationType="fade" onRequestClose={() => setStatusFor(null)}>
        <Pressable style={[styles.overlay, { backgroundColor: theme.colors.overlay }]} onPress={() => setStatusFor(null)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sheet }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>Set status</Text>
            {MARK_STATUSES.map((s) => {
              const c = statusColors(s.key);
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.optionRow, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    if (statusFor != null) t.setCellStatus(statusFor, t.selectedDate, s.key);
                    setStatusFor(null);
                  }}
                >
                  <Ionicons name={s.icon} size={18} color={c.fg} />
                  <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: theme.colors.overlay }]} onPress={() => setMenuOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sheet }]}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                setMenuOpen(false);
                void t.refetch();
              }}
            >
              <Ionicons name="refresh-outline" size={18} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>Refresh</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );

  if (embedded) {
    return (
      <View>
        {body}
        {pickers}
      </View>
    );
  }

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Mark Attendance"
          showBack={showBack}
          trailingIcon="ellipsis-vertical"
          onTrailingPress={() => setMenuOpen(true)}
          trailingAccessibilityLabel="More options"
        />
      }
      footer={
        <PrimaryButton
          label={t.saving ? 'Saving…' : 'Save Attendance'}
          loading={t.saving}
          disabled={!t.hasEdits || t.saving || !editable}
          onPress={() => void onSave()}
        />
      }
      contentStyle={styles.screenContent}
      refreshing={t.status === 'loading'}
      onRefresh={() => void t.refetch()}
    >
      {body}
      {pickers}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 16 },
  body: { gap: 14 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  dateLabel: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  totalWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalCaption: { fontSize: 12, fontWeight: '600' },
  totalBadge: {
    minWidth: 36,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalValue: { fontSize: 14, fontWeight: '800' },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  toolsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllBtn: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: { fontSize: 13, fontWeight: '700' },
  listCard: { overflow: 'hidden' },
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  th: { fontSize: 12, fontWeight: '700' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  idx: { width: 22, fontSize: 13, fontWeight: '600' },
  nameCol: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 14, fontWeight: '700' },
  adm: { fontSize: 11 },
  statusBtn: {
    width: 118,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  statusBtnText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '600' },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    padding: 16,
    gap: 10,
    marginBottom: 24,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
});
