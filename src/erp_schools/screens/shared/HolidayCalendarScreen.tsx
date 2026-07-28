/**
 * Holidays — web HolidayCalendarTab / HolidayListPanel parity (all personas).
 * Students: read-only. Staff: Add / Edit / Delete.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  TeacherScreen,
  ScreenHeader,
  StudentModuleHeader,
  SurfaceCard,
  SectionHeader,
  FilterChips,
  EmptyState,
  ScreenLoader,
  InfoBanner,
  PrimaryButton,
  type ChipOption,
} from '../../components';
import { useTeacherTheme } from '../../theme/useTeacherTheme';
import { useSchoolsSession } from '../../hooks/useSchoolsSession';
import {
  useHolidayCalendarData,
  type HolidayItem,
} from '../../hooks/useHolidayCalendarData';
import {
  HOLIDAY_FILTERS,
  daysUntil,
  holidayTypeMeta,
  weekdayName,
  type HolidayFilterKey,
} from '../../utils/holidayMeta';

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const PAGE_SIZE = 10;

type Nav = NativeStackNavigationProp<{
  HolidayCalendar: undefined;
  CreateHoliday: { holidayId?: number };
}>;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function dateKey(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function buildHolidayDateMap(holidays: HolidayItem[]): Map<string, HolidayItem[]> {
  const map = new Map<string, HolidayItem[]>();
  for (const h of holidays) {
    if (!h.startDate) continue;
    const start = new Date(`${h.startDate}T00:00:00`);
    const end = new Date(`${h.endDate || h.startDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) continue;
    const cursor = new Date(start);
    const last = Number.isNaN(end.getTime()) ? start : end;
    while (cursor <= last) {
      const key = dateKey(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
      const list = map.get(key) || [];
      list.push(h);
      map.set(key, list);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return map;
}

function TypeBadge({ type }: { type: string }) {
  const meta = holidayTypeMeta(type);
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
    </View>
  );
}

export default function HolidayCalendarScreen() {
  const theme = useTeacherTheme();
  const navigation = useNavigation<Nav>();
  const { isStudent } = useSchoolsSession();
  const m = useHolidayCalendarData();
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<HolidayItem | null>(null);

  const refetchRef = useRef(m.refetch);
  refetchRef.current = m.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchRef.current();
    }, []),
  );

  useEffect(() => {
    setPage(1);
  }, [m.filter, m.year]);

  const filterChips: ChipOption[] = HOLIDAY_FILTERS.map((f) => ({
    key: f.key,
    label: f.label,
  }));

  const holidayDates = useMemo(() => buildHolidayDateMap(m.holidays), [m.holidays]);

  const cells = useMemo(() => {
    const firstDow = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < firstDow; i += 1) out.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [calMonth, calYear]);

  const totalPages = Math.max(1, Math.ceil(m.filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return m.filtered.slice(start, start + PAGE_SIZE);
  }, [m.filtered, pageSafe]);

  const showingFrom = m.filtered.length === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(pageSafe * PAGE_SIZE, m.filtered.length);

  const goPrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((x) => x - 1);
  };

  const goNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((x) => x + 1);
  };

  const onDelete = (item: HolidayItem) => {
    Alert.alert('Delete holiday?', `Remove “${item.name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const ok = await m.deleteHoliday(item.holidayId);
            if (!ok) Alert.alert('Delete failed', m.error || 'Could not delete holiday.');
          })();
        },
      },
    ]);
  };

  if (m.loading && m.holidays.length === 0) {
    return (
      <TeacherScreen
        header={
          isStudent ? (
            <StudentModuleHeader title="Holidays" />
          ) : (
            <ScreenHeader title="Holidays" />
          )
        }
      >
        <ScreenLoader message="Loading holidays…" />
      </TeacherScreen>
    );
  }

  const next = m.summary.nextHoliday;
  const nextDays = next ? daysUntil(next.startDate, m.todayStr) : null;

  return (
    <TeacherScreen
      header={
        isStudent ? (
          <StudentModuleHeader
            title="Holidays"
            trailingIcon="refresh-outline"
            onTrailingPress={() => void m.refetch()}
          />
        ) : (
          <ScreenHeader
            title="Holidays"
            trailingIcon={m.canManage ? 'add' : 'refresh-outline'}
            onTrailingPress={
              m.canManage
                ? () => navigation.navigate('CreateHoliday', {})
                : () => void m.refetch()
            }
          />
        )
      }
      contentStyle={styles.content}
      refreshing={m.status === 'loading'}
      onRefresh={() => void m.refetch()}
      footer={
        m.canManage ? (
          <PrimaryButton
            label="Add Holiday"
            icon="add-circle-outline"
            variant="gradient"
            onPress={() => navigation.navigate('CreateHoliday', {})}
          />
        ) : undefined
      }
    >
      <View style={styles.heroBlock}>
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Academic Calendar</Text>
        <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
          {m.canManage
            ? 'Manage school holidays, festivals, and academic breaks for the year.'
            : 'View school holidays, festivals, and academic breaks for the year.'}
        </Text>
      </View>

      {/* Year selector */}
      <View style={styles.yearRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Holiday List ({m.year})
          </Text>
          <Text style={[styles.sectionSub, { color: theme.colors.textSecondary }]}>
            Stay updated with all the holidays and breaks.
          </Text>
        </View>
        <View style={styles.yearStepper}>
          <TouchableOpacity
            onPress={() => m.setYear(m.year - 1)}
            style={[styles.yearBtn, { borderColor: theme.colors.border }]}
            accessibilityLabel="Previous year"
          >
            <Ionicons name="chevron-back" size={16} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.yearText, { color: theme.colors.textPrimary }]}>{m.year}</Text>
          <TouchableOpacity
            onPress={() => m.setYear(m.year + 1)}
            style={[styles.yearBtn, { borderColor: theme.colors.border }]}
            accessibilityLabel="Next year"
          >
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryGrid}>
        {[
          { key: 'up', label: 'Upcoming', value: m.summary.upcoming, bg: '#dcfce7', fg: '#15803d' },
          { key: 'ac', label: 'Academic', value: m.summary.academic, bg: '#ffedd5', fg: '#c2410c' },
          { key: 'fe', label: 'Festivals', value: m.summary.festivals, bg: '#ede9fe', fg: '#6d28d9' },
          { key: 'to', label: 'Total', value: m.summary.total, bg: '#dbeafe', fg: '#1d4ed8' },
        ].map((card) => (
          <View key={card.key} style={[styles.summaryCard, { backgroundColor: card.bg }]}>
            <Text style={[styles.summaryValue, { color: card.fg }]}>{pad2(card.value)}</Text>
            <Text style={[styles.summaryLabel, { color: card.fg }]}>{card.label}</Text>
          </View>
        ))}
      </View>

      {/* Next holiday */}
      {next ? (
        <SurfaceCard style={styles.nextCard} onPress={() => setDetail(next)}>
          <Text style={[styles.nextEyebrow, { color: theme.colors.primary }]}>NEXT HOLIDAY</Text>
          <Text style={[styles.nextName, { color: theme.colors.textPrimary }]}>{next.name}</Text>
          <Text style={[styles.nextDate, { color: theme.colors.textSecondary }]}>
            {weekdayName(next.startDate)}, {next.dateLabel}
          </Text>
          <View style={[styles.nextBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.nextBadgeText}>
              {nextDays === 0 ? 'Today' : `In ${nextDays} Days`}
            </Text>
          </View>
        </SurfaceCard>
      ) : null}

      {/* Month calendar */}
      <SurfaceCard>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={goPrevMonth} accessibilityLabel="Previous month">
            <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.colors.textPrimary }]}>
            {MONTH_NAMES[calMonth]} {calYear}
          </Text>
          <TouchableOpacity onPress={goNextMonth} accessibilityLabel="Next month">
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {WEEK_LABELS.map((label) => (
            <Text key={label} style={[styles.weekLabel, { color: theme.colors.textSecondary }]}>
              {label}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((day, index) => {
            if (day === null) return <View key={`b-${index}`} style={styles.cell} />;
            const iso = dateKey(calYear, calMonth + 1, day);
            const hols = holidayDates.get(iso) || [];
            const hol = hols[0];
            const meta = hol ? holidayTypeMeta(hol.holidayType) : null;
            const isToday = iso === m.todayStr;
            return (
              <TouchableOpacity
                key={iso}
                style={styles.cell}
                disabled={!hol}
                onPress={() => hol && setDetail(hol)}
                activeOpacity={hol ? 0.75 : 1}
              >
                <View
                  style={[
                    styles.dayWrap,
                    meta && { backgroundColor: meta.bg },
                    isToday && { borderWidth: 2, borderColor: '#818cf8' },
                    !meta && isToday && { backgroundColor: '#eef2ff' },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: meta
                          ? meta.fg
                          : isToday
                            ? '#4338ca'
                            : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={[styles.legend, { borderTopColor: theme.colors.border }]}>
          {[
            { label: 'Holiday', color: '#22c55e' },
            { label: 'Break', color: '#f97316' },
            { label: 'Festival', color: '#8b5cf6' },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      {/* Type filters */}
      <FilterChips
        size="sm"
        options={filterChips}
        activeKey={m.filter}
        onChange={(k) => m.setFilter(k as HolidayFilterKey)}
      />

      {m.error ? (
        <Text style={[styles.error, { color: theme.colors.danger }]}>{m.error}</Text>
      ) : null}

      <SectionHeader title="Holidays" />

      {m.filtered.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No holidays"
          message={
            m.filter === 'all'
              ? 'Holiday list will appear here once published.'
              : 'No holidays match this filter.'
          }
          ctaLabel={m.canManage ? 'Add Holiday' : undefined}
          onCtaPress={
            m.canManage ? () => navigation.navigate('CreateHoliday', {}) : undefined
          }
        />
      ) : (
        <SurfaceCard padded={false} style={styles.listCard}>
          {pageSlice.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.row,
                index < pageSlice.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.colors.border,
                },
              ]}
              onPress={() => setDetail(item)}
              activeOpacity={0.85}
            >
              <View style={styles.rowDate}>
                <Text style={[styles.rowDateText, { color: theme.colors.primary }]}>
                  {item.rangeLabel}
                </Text>
                <Text style={[styles.rowDay, { color: theme.colors.textSecondary }]}>
                  {weekdayName(item.startDate)}
                </Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.rowName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <TypeBadge type={item.holidayType} />
                {item.description ? (
                  <Text
                    style={[styles.rowDesc, { color: theme.colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
              {m.canManage ? (
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('CreateHoliday', { holidayId: item.holidayId })
                    }
                    hitSlop={8}
                  >
                    <Text style={{ color: theme.colors.info, fontSize: 12, fontWeight: '700' }}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete(item)} hitSlop={8}>
                    <Text style={{ color: theme.colors.danger, fontSize: 12, fontWeight: '700' }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </SurfaceCard>
      )}

      {m.filtered.length > 0 ? (
        <View style={styles.pager}>
          <Text style={[styles.pagerMeta, { color: theme.colors.textSecondary }]}>
            Showing {showingFrom} to {showingTo} of {m.filtered.length} holidays
          </Text>
          <View style={styles.pagerBtns}>
            <TouchableOpacity
              style={[styles.pageBtn, { borderColor: theme.colors.border, opacity: pageSafe <= 1 ? 0.4 : 1 }]}
              disabled={pageSafe <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Text style={[styles.pageBtnText, { color: theme.colors.primary }]}>Previous</Text>
            </TouchableOpacity>
            <Text style={[styles.pageNum, { color: theme.colors.textPrimary }]}>
              {pageSafe}/{totalPages}
            </Text>
            <TouchableOpacity
              style={[
                styles.pageBtn,
                { borderColor: theme.colors.border, opacity: pageSafe >= totalPages ? 0.4 : 1 },
              ]}
              disabled={pageSafe >= totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <Text style={[styles.pageBtnText, { color: theme.colors.primary }]}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <InfoBanner text="Holiday dates are subject to change. Please check notices for updates." />

      {/* Detail sheet */}
      <Modal
        visible={!!detail}
        transparent
        animationType="slide"
        onRequestClose={() => setDetail(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDetail(null)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            {detail ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
                  {detail.name}
                </Text>
                <View style={{ marginVertical: 8 }}>
                  <TypeBadge type={detail.holidayType} />
                </View>
                {(
                  [
                    ['Date', detail.rangeLabel],
                    ['Day', weekdayName(detail.startDate)],
                    ['Description', detail.description || '—'],
                  ] as const
                ).map(([label, value]) => (
                  <View key={label} style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      {label}
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
                      {value}
                    </Text>
                  </View>
                ))}
                {m.canManage ? (
                  <View style={styles.sheetActions}>
                    <TouchableOpacity
                      style={[styles.sheetBtn, { backgroundColor: theme.colors.tintBlue }]}
                      onPress={() => {
                        setDetail(null);
                        navigation.navigate('CreateHoliday', { holidayId: detail.holidayId });
                      }}
                    >
                      <Text style={[styles.sheetBtnText, { color: theme.colors.info }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sheetBtn, { backgroundColor: theme.colors.tintRed }]}
                      onPress={() => {
                        setDetail(null);
                        onDelete(detail);
                      }}
                    >
                      <Text style={[styles.sheetBtnText, { color: theme.colors.danger }]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setDetail(null)}
                >
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  heroBlock: { gap: 2 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroSub: { fontSize: 13, lineHeight: 18 },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionSub: { fontSize: 12, marginTop: 2 },
  yearStepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yearBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: { fontSize: 15, fontWeight: '700', minWidth: 48, textAlign: 'center' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 72,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '600' },
  nextCard: { gap: 6 },
  nextEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  nextName: { fontSize: 18, fontWeight: '800' },
  nextDate: { fontSize: 13 },
  nextBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  nextBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthTitle: { fontSize: 15, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 13, fontWeight: '600' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '600' },
  error: { fontSize: 13 },
  listCard: { paddingHorizontal: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowDate: { width: 88 },
  rowDateText: { fontSize: 12, fontWeight: '800' },
  rowDay: { fontSize: 11, marginTop: 2 },
  rowBody: { flex: 1, gap: 4, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowDesc: { fontSize: 11, lineHeight: 15 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actions: { gap: 8, alignItems: 'flex-end' },
  pager: { gap: 8 },
  pagerMeta: { fontSize: 12, fontWeight: '600' },
  pagerBtns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  pageBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageBtnText: { fontSize: 13, fontWeight: '700' },
  pageNum: { fontSize: 13, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '70%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  detailLabel: { fontSize: 13, fontWeight: '600' },
  detailValue: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  sheetBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sheetBtnText: { fontSize: 14, fontWeight: '700' },
  closeBtn: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
