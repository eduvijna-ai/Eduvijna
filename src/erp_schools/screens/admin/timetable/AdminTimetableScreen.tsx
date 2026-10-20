/**
 * Admin Timetable Management — web TimetableTab parity.
 * Tabs: Templates | Weekly Schedule | Calendar (+ slot/template CRUD).
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SearchBar,
  Badge,
  EmptyState,
  ScreenLoader,
  PrimaryButton,
  SelectField,
  FormField,
  TextField,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import {
  useAdminTimetableData,
  type TtSlot,
  type TtTemplate,
} from '../../../hooks/useAdminTimetableData';
import {
  TT_DAY_NAMES,
  TT_SLOT_TYPES,
  TT_TABS,
  fmtTtTime,
  slotTypeAccent,
  type TtTabKey,
} from '../../../utils/timetableMeta';
import { toLocalDateStr } from '../../../utils/apiHelpers';
import { accentColors } from '../../../theme/accents';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AdminTimetableScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const [tab, setTab] = useState<TtTabKey>('templates');
  const [query, setQuery] = useState('');
  const tt = useAdminTimetableData(tab);

  const [subSlot, setSubSlot] = useState<TtSlot | null>(null);
  const [subDate, setSubDate] = useState(toLocalDateStr());
  const [subTeacherId, setSubTeacherId] = useState<string>('');
  const [subReason, setSubReason] = useState('');

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tt.templates;
    return tt.templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.className.toLowerCase().includes(q) ||
        t.sectionName.toLowerCase().includes(q),
    );
  }, [tt.templates, query]);

  const openTemplate = (t: TtTemplate) => {
    tt.setSelectedTemplateId(t.id);
    tt.clearBrowse();
    setTab('grid');
  };

  const confirmDeactivate = (t: TtTemplate) => {
    Alert.alert('Deactivate template?', `"${t.name}" will be deactivated.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => {
          void tt.deactivateTemplate(t.id).then((ok) => {
            if (!ok) Alert.alert('Failed', tt.error || 'Could not deactivate.');
          });
        },
      },
    ]);
  };

  const confirmDeleteSlot = (s: TtSlot) => {
    Alert.alert('Delete slot?', `${s.subjectName} · ${fmtTtTime(s.startTime)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void tt.deleteSlot(s.id).then((ok) => {
            if (!ok) Alert.alert('Failed', tt.error || 'Could not delete.');
          });
        },
      },
    ]);
  };

  const openSubstitute = async (s: TtSlot) => {
    setSubSlot(s);
    setSubDate(toLocalDateStr());
    setSubTeacherId('');
    setSubReason('');
    const classId = s.classId || tt.selectedTemplate?.classId;
    await tt.loadSubjectsTeachers(classId, s.sectionId || tt.selectedTemplate?.sectionId);
  };

  const submitSubstitute = async () => {
    if (!subSlot || !subTeacherId) {
      Alert.alert('Required', 'Pick a substitute teacher and date.');
      return;
    }
    const ok = await tt.createSubstitute({
      slot_id: subSlot.id,
      original_teacher_id: subSlot.teacherId,
      substitute_teacher_id: Number(subTeacherId),
      substitute_date: subDate,
      reason: subReason.trim() || undefined,
    });
    if (ok) {
      Alert.alert('Saved', 'Substitute recorded.');
      setSubSlot(null);
    } else {
      Alert.alert('Failed', tt.error || 'Could not save substitute.');
    }
  };

  const bootLoading = tt.status === 'idle' || (tt.status === 'loading' && tab === 'templates' && !tt.templates.length);

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Timetable"
          trailingIcon={tab === 'templates' ? 'add' : tab === 'grid' ? 'add' : undefined}
          onTrailingPress={
            tab === 'templates'
              ? () => navigation.navigate('CreateTimetableTemplate', {})
              : tab === 'grid'
                ? () =>
                    navigation.navigate('CreateTimetableSlot', {
                      templateId: tt.selectedTemplateId,
                      dayOfWeek: tt.activeDay,
                    })
                : undefined
          }
        />
      }
      contentStyle={styles.content}
      refreshing={tt.status === 'loading' || tt.saving}
      onRefresh={() => void tt.refetch()}
      footer={
        tab === 'templates' ? (
          <PrimaryButton
            label="New Template"
            icon="add-circle-outline"
            onPress={() => navigation.navigate('CreateTimetableTemplate', {})}
          />
        ) : tab === 'grid' ? (
          <PrimaryButton
            label="Add Slot"
            icon="add-circle-outline"
            onPress={() =>
              navigation.navigate('CreateTimetableSlot', {
                templateId: tt.selectedTemplateId,
                dayOfWeek: tt.activeDay,
              })
            }
          />
        ) : undefined
      }
    >
      <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Scheduling</Text>
      <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
        Timetable Management
      </Text>
      <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
        Build templates, manage weekly schedules, and view timetables on the calendar.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRail}>
        {TT_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[
                styles.tabCard,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.tabTitle, { color: active ? '#FFF' : theme.colors.textPrimary }]}>
                {t.title}
              </Text>
              <Text
                style={[
                  styles.tabSub,
                  { color: active ? 'rgba(255,255,255,0.85)' : theme.colors.textSecondary },
                ]}
                numberOfLines={2}
              >
                {t.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {tt.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{tt.error}</Text>
      ) : null}

      {bootLoading ? <ScreenLoader message="Loading timetable…" /> : null}

      {!bootLoading && tab === 'templates' ? (
        <TemplatesPanel
          templates={filteredTemplates}
          query={query}
          onQuery={setQuery}
          onOpen={openTemplate}
          onEdit={(t) => navigation.navigate('CreateTimetableTemplate', { templateId: t.id })}
          onDeactivate={confirmDeactivate}
        />
      ) : null}

      {!bootLoading && tab === 'grid' ? (
        <WeeklyPanel
          tt={tt}
          onEditSlot={(s) =>
            navigation.navigate('CreateTimetableSlot', {
              slotId: s.id,
              templateId: s.templateId,
              dayOfWeek: s.dayOfWeek,
            })
          }
          onSubstitute={openSubstitute}
          onDelete={confirmDeleteSlot}
        />
      ) : null}

      {!bootLoading && tab === 'calendar' ? <CalendarPanel tt={tt} /> : null}

      <Modal visible={!!subSlot} transparent animationType="fade" onRequestClose={() => setSubSlot(null)}>
        <View style={styles.modalBackdrop}>
          <SurfaceCard style={styles.modalCard}>
            <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
              Substitute Teacher
            </Text>
            {subSlot ? (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 8 }}>
                {subSlot.subjectName} · {fmtTtTime(subSlot.startTime)}–{fmtTtTime(subSlot.endTime)}
              </Text>
            ) : null}
            <FormField label="Date *">
              <TextField value={subDate} onChangeText={setSubDate} placeholder="YYYY-MM-DD" />
            </FormField>
            <FormField label="Substitute teacher *">
              <SelectField
                options={tt.teachers
                  .filter((t) => t.id !== subSlot?.teacherId)
                  .map((t) => ({ label: t.name, value: String(t.id) }))}
                value={subTeacherId || null}
                onChange={(v) => setSubTeacherId(v || '')}
                placeholder="Select teacher"
              />
            </FormField>
            <FormField label="Reason">
              <TextField value={subReason} onChangeText={setSubReason} placeholder="Optional" />
            </FormField>
            <View style={styles.modalActions}>
              <PrimaryButton label="Cancel" variant="outline" onPress={() => setSubSlot(null)} />
              <PrimaryButton
                label={tt.saving ? 'Saving…' : 'Save'}
                loading={tt.saving}
                onPress={() => void submitSubstitute()}
              />
            </View>
          </SurfaceCard>
        </View>
      </Modal>
    </TeacherScreen>
  );
}

function TemplatesPanel({
  templates,
  query,
  onQuery,
  onOpen,
  onEdit,
  onDeactivate,
}: {
  templates: TtTemplate[];
  query: string;
  onQuery: (q: string) => void;
  onOpen: (t: TtTemplate) => void;
  onEdit: (t: TtTemplate) => void;
  onDeactivate: (t: TtTemplate) => void;
}) {
  const theme = useTeacherTheme();
  return (
    <View style={{ gap: 12 }}>
      <SearchBar value={query} onChangeText={onQuery} placeholder="Search templates…" />
      {templates.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No templates"
          message="Create a timetable template to start scheduling."
        />
      ) : (
        templates.map((t) => (
          <SurfaceCard key={t.id} style={styles.card}>
            <TouchableOpacity onPress={() => onOpen(t)} activeOpacity={0.75}>
              <View style={styles.rowBetween}>
                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                  {t.name}
                </Text>
                <Badge label={t.isActive ? 'Active' : 'Inactive'} accent={t.isActive ? 'green' : 'orange'} />
              </View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                {t.className}
                {t.sectionName && t.sectionName !== '—' ? ` · ${t.sectionName}` : ''}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                {t.effectiveFrom || '—'} → {t.effectiveTo || '—'}
              </Text>
            </TouchableOpacity>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: '#DBEAFE' }]}
                onPress={() => onEdit(t)}
              >
                <Text style={{ color: '#1D4ED8', fontWeight: '700', fontSize: 12 }}>Edit</Text>
              </TouchableOpacity>
              {t.isActive ? (
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: '#FEE2E2' }]}
                  onPress={() => onDeactivate(t)}
                >
                  <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 12 }}>Deactivate</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </SurfaceCard>
        ))
      )}
    </View>
  );
}

function WeeklyPanel({
  tt,
  onEditSlot,
  onSubstitute,
  onDelete,
}: {
  tt: ReturnType<typeof useAdminTimetableData>;
  onEditSlot: (s: TtSlot) => void;
  onSubstitute: (s: TtSlot) => void;
  onDelete: (s: TtSlot) => void;
}) {
  const theme = useTeacherTheme();

  return (
    <View style={{ gap: 12 }}>
      <SurfaceCard style={styles.filterCard}>
        <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
          View by class & section
        </Text>
        <FormField label="Class *">
          <SelectField
            options={tt.classes.map((c) => ({ label: c.name, value: String(c.id) }))}
            value={tt.browseClassId != null ? String(tt.browseClassId) : null}
            onChange={(v) => {
              tt.setBrowseClassId(v ? Number(v) : undefined);
              tt.setBrowseSectionId(undefined);
            }}
            placeholder="Select class"
          />
        </FormField>
        <FormField label="Section *">
          <SelectField
            options={tt.sections.map((s) => ({ label: s.name, value: String(s.id) }))}
            value={tt.browseSectionId != null ? String(tt.browseSectionId) : null}
            onChange={(v) => tt.setBrowseSectionId(v ? Number(v) : undefined)}
            placeholder="Select section"
          />
        </FormField>
        <View style={styles.actionRow}>
          <PrimaryButton label="Search" onPress={tt.runBrowseSearch} />
          <PrimaryButton label="Clear" variant="outline" onPress={tt.clearBrowse} />
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.filterCard}>
        <FormField label="Template">
          <SelectField
            options={tt.templates
              .filter((t) => t.isActive)
              .map((t) => ({
                label: `${t.name} (${t.className})`,
                value: String(t.id),
              }))}
            value={tt.selectedTemplateId != null ? String(tt.selectedTemplateId) : null}
            onChange={(v) => {
              tt.setSelectedTemplateId(v ? Number(v) : undefined);
              tt.clearBrowse();
            }}
            placeholder="Select template"
          />
        </FormField>
      </SurfaceCard>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRail}>
        {TT_DAY_NAMES.map((label, i) => {
          const active = tt.activeDay === i;
          return (
            <TouchableOpacity
              key={label}
              onPress={() => tt.setActiveDay(i)}
              style={[
                styles.dayChip,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text style={{ fontWeight: '800', color: active ? '#FFF' : theme.colors.textPrimary }}>
                {label}
              </Text>
              <Text style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.85)' : theme.colors.textSecondary }}>
                {tt.dayCounts[i] || 0}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {tt.slotsForDay.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title={`No slots for ${TT_DAY_NAMES[tt.activeDay]}`}
          message="Add a slot or pick another day / template."
        />
      ) : (
        tt.slotsForDay.map((s) => {
          const accent = accentColors(theme.colors, slotTypeAccent(s.slotType));
          return (
            <SurfaceCard key={s.id} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: accent.fg }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                {s.periodNumber > 0 ? `P${s.periodNumber}` : 'P—'} · {s.subjectName}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                {s.className} · {s.sectionName}
              </Text>
              <Text style={{ color: theme.colors.primary, fontWeight: '800', marginTop: 6 }}>
                {fmtTtTime(s.startTime)} – {fmtTtTime(s.endTime)}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                {s.teacherName} · Room {s.room}
              </Text>
              <View style={{ marginTop: 8 }}>
                <Badge label={s.slotType} accent={slotTypeAccent(s.slotType)} />
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#DBEAFE' }]} onPress={() => onEditSlot(s)}>
                  <Ionicons name="create-outline" size={16} color="#1D4ED8" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: '#FEF3C7' }]}
                  onPress={() => void onSubstitute(s)}
                >
                  <Ionicons name="swap-horizontal-outline" size={16} color="#D97706" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => onDelete(s)}>
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </SurfaceCard>
          );
        })
      )}
    </View>
  );
}

function CalendarPanel({ tt }: { tt: ReturnType<typeof useAdminTimetableData> }) {
  const theme = useTeacherTheme();
  const year = tt.monthCursor.getFullYear();
  const month = tt.monthCursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay(); // Sun=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayYmd = toLocalDateStr();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const cells: Array<{ day: number | null; ymd?: string }> = [];
  for (let i = 0; i < firstDow; i += 1) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d += 1) {
    const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, ymd });
  }

  const selectedSlots = selectedDay ? tt.calendarSlotsByDate[selectedDay] || [] : [];

  return (
    <View style={{ gap: 12 }}>
      <SurfaceCard style={styles.filterCard}>
        <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
          View calendar by class & section
        </Text>
        <FormField label="Class *">
          <SelectField
            options={tt.classes.map((c) => ({ label: c.name, value: String(c.id) }))}
            value={tt.browseClassId != null ? String(tt.browseClassId) : null}
            onChange={(v) => {
              tt.setBrowseClassId(v ? Number(v) : undefined);
              tt.setBrowseSectionId(undefined);
            }}
            placeholder="Select class"
          />
        </FormField>
        <FormField label="Section *">
          <SelectField
            options={tt.sections.map((s) => ({ label: s.name, value: String(s.id) }))}
            value={tt.browseSectionId != null ? String(tt.browseSectionId) : null}
            onChange={(v) => tt.setBrowseSectionId(v ? Number(v) : undefined)}
            placeholder="Select section"
          />
        </FormField>
        <View style={styles.actionRow}>
          <PrimaryButton label="Search" onPress={tt.runBrowseSearch} />
          <PrimaryButton label="Clear" variant="outline" onPress={tt.clearBrowse} />
        </View>
        <FormField label="Template">
          <SelectField
            options={tt.templates
              .filter((t) => t.isActive)
              .map((t) => ({ label: `${t.name} (${t.className})`, value: String(t.id) }))}
            value={tt.selectedTemplateId != null ? String(tt.selectedTemplateId) : null}
            onChange={(v) => {
              tt.setSelectedTemplateId(v ? Number(v) : undefined);
              tt.clearBrowse();
            }}
            placeholder="Select template"
          />
        </FormField>
        <FormField label="Type">
          <SelectField
            options={[
              { label: 'All Types', value: 'all' },
              ...TT_SLOT_TYPES.map((t) => ({
                label: t.charAt(0).toUpperCase() + t.slice(1),
                value: t,
              })),
            ]}
            value={tt.slotTypeFilter}
            onChange={(v) => tt.setSlotTypeFilter(v || 'all')}
          />
        </FormField>
      </SurfaceCard>

      <SurfaceCard style={styles.filterCard}>
        <View style={styles.rowBetween}>
          <TouchableOpacity
            onPress={() => tt.setMonthCursor(new Date(year, month - 1, 1))}
            style={styles.navBtn}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={{ fontWeight: '800', fontSize: 16, color: theme.colors.textPrimary }}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <TouchableOpacity
            onPress={() => tt.setMonthCursor(new Date(year, month + 1, 1))}
            style={styles.navBtn}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <PrimaryButton
          label="Today"
          variant="outline"
          onPress={() => {
            const n = new Date();
            tt.setMonthCursor(new Date(n.getFullYear(), n.getMonth(), 1));
            setSelectedDay(toLocalDateStr(n));
          }}
        />
      </SurfaceCard>

      <SurfaceCard padded={false} style={styles.calCard}>
        <View style={styles.calHeaderRow}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <Text key={d} style={[styles.calHead, { color: theme.colors.textSecondary }]}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.calGrid}>
          {cells.map((c, idx) => {
            if (!c.day || !c.ymd) {
              return <View key={`e-${idx}`} style={styles.calCell} />;
            }
            const count = (tt.calendarSlotsByDate[c.ymd] || []).length;
            const isToday = c.ymd === todayYmd;
            const selected = c.ymd === selectedDay;
            return (
              <TouchableOpacity
                key={c.ymd}
                style={[
                  styles.calCell,
                  isToday && { backgroundColor: '#CCFBF1' },
                  selected && { borderColor: theme.colors.primary, borderWidth: 1.5 },
                ]}
                onPress={() => setSelectedDay(c.ymd!)}
              >
                <View
                  style={[
                    styles.calDayNum,
                    isToday && { backgroundColor: theme.colors.primary, borderRadius: 10 },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: isToday ? '#FFF' : theme.colors.textPrimary,
                    }}
                  >
                    {c.day}
                  </Text>
                </View>
                {count > 0 ? (
                  <View style={[styles.calDot, { backgroundColor: theme.colors.primary }]} />
                ) : null}
                {count > 0 ? (
                  <Text style={{ fontSize: 9, color: theme.colors.textSecondary }}>{count}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </SurfaceCard>

      {selectedDay ? (
        <SurfaceCard style={styles.card}>
          <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
            {selectedDay}
          </Text>
          {selectedSlots.length === 0 ? (
            <Text style={{ color: theme.colors.textSecondary }}>No slots this day.</Text>
          ) : (
            selectedSlots.map((s) => (
              <View key={`${s.id}-${selectedDay}`} style={styles.calSlotRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>{s.subjectName}</Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                    {fmtTtTime(s.startTime)} · {s.teacherName}
                  </Text>
                </View>
                <Badge label={s.slotType} accent={slotTypeAccent(s.slotType)} />
              </View>
            ))
          )}
        </SurfaceCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 28 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  heroTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  heroSub: { fontSize: 14, lineHeight: 20 },
  tabRail: { gap: 10, paddingRight: 8 },
  tabCard: {
    width: 168,
    minHeight: 74,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tabTitle: { fontSize: 13, fontWeight: '700' },
  tabSub: { fontSize: 11, lineHeight: 14, marginTop: 4 },
  sectionHeading: { fontSize: 16, fontWeight: '700' },
  filterCard: { gap: 8 },
  card: { gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayRail: { gap: 8, paddingVertical: 2 },
  dayChip: {
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 2,
  },
  navBtn: { padding: 8 },
  calCard: { overflow: 'hidden' },
  calHeaderRow: { flexDirection: 'row', paddingHorizontal: 4, paddingTop: 8 },
  calHead: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 4 },
  calCell: {
    width: `${100 / 7}%`,
    minHeight: 52,
    padding: 4,
    alignItems: 'center',
    borderRadius: 8,
  },
  calDayNum: { paddingHorizontal: 6, paddingVertical: 2 },
  calDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  calSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { gap: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
