/**
 * Holiday Calendar Screen
 * Displays holidays in both month-grid view and list view.
 * Type colors: national | academic | religious | cultural | regional | other
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { holidaysApi } from '../../core/api/erp.api';
import {
  COLORS,
  SectionHeader,
  ListRow,
  LoadingState,
  EmptyState,
  FormModal,
  FormField,
  StyledInput,
  SimpleSelect,
} from '../components/common';
import { useErpRole } from '../hooks/useErpRole';

const HOLIDAY_TYPES = ['national', 'academic', 'religious', 'cultural', 'regional', 'other'].map((t) => ({ label: t, value: t }));

const TYPE_COLORS: Record<string, string> = {
  national: '#e53e3e',
  academic: '#3182ce',
  religious: '#ed8936',
  cultural: '#9f7aea',
  regional: '#38a169',
  other: '#718096',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function expandHolidayDates(holiday: any): string[] {
  const dates: string[] = [];
  const start = new Date(holiday.start_date);
  const end = new Date(holiday.end_date ?? holiday.start_date);
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function buildHolidayMap(holidays: any[]): Record<string, any[]> {
  const map: Record<string, any[]> = {};
  for (const h of holidays) {
    for (const d of expandHolidayDates(h)) {
      if (!map[d]) map[d] = [];
      map[d].push(h);
    }
  }
  return map;
}

function MonthGrid({ year, month, holidayMap }: { year: number; month: number; holidayMap: Record<string, any[]> }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <View style={styles.grid}>
      {DOW.map((d) => (
        <View key={d} style={styles.dowCell}>
          <Text style={styles.dowText}>{d}</Text>
        </View>
      ))}
      {cells.map((day, idx) => {
        if (!day) return <View key={`e-${idx}`} style={styles.dayCell} />;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const holidays = holidayMap[dateStr] ?? [];
        const isToday = dateStr === today;
        const color = holidays[0] ? TYPE_COLORS[holidays[0].holiday_type ?? 'other'] : undefined;
        return (
          <View key={dateStr} style={[styles.dayCell, isToday && styles.todayCell, color ? { backgroundColor: color + '22' } : undefined]}>
            <Text style={[styles.dayText, isToday && styles.todayText, color ? { color, fontWeight: '700' } : undefined]}>{day}</Text>
            {holidays.length > 0 && <View style={[styles.dot, { backgroundColor: color ?? COLORS.primary }]} />}
          </View>
        );
      })}
    </View>
  );
}

export default function HolidayCalendarScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const baseParams = schoolId ? { school_id: schoolId } : {};

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const [allHolidays, setAllHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await holidaysApi.list({ year: viewYear, per_page: 200, ...baseParams });
      setAllHolidays(data?.items ?? data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [viewYear, JSON.stringify(baseParams)]);

  useEffect(() => { load(); }, [viewYear]);

  const holidayMap = useMemo(() => buildHolidayMap(allHolidays), [allHolidays]);

  const monthHolidays = useMemo(() =>
    allHolidays.filter((h) => {
      const m = new Date(h.start_date).getMonth();
      return m === viewMonth;
    }),
    [allHolidays, viewMonth]
  );

  const openAdd = () => { setEditingId(null); setForm({ holiday_type: 'national' }); setShowModal(true); };
  const openEdit = (item: any) => { setEditingId(item.id); setForm({ ...item }); setShowModal(true); };

  const save = async () => {
    if (!form.title?.trim() || !form.start_date?.trim()) {
      Alert.alert('Validation', 'Title and Start Date are required.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) await holidaysApi.update(editingId, { ...form, ...baseParams });
      else await holidaysApi.create({ ...form, ...baseParams });
      setShowModal(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: any) => {
    try { await holidaysApi.softDelete(id); load(); }
    catch { Alert.alert('Error', 'Delete failed.'); }
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      {/* Month navigation header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
          style={[styles.navBtn, { marginLeft: 8 }]}
        >
          <Ionicons name={viewMode === 'calendar' ? 'list-outline' : 'calendar-outline'} size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {loading ? <LoadingState /> : (
          <>
            {viewMode === 'calendar' && <MonthGrid year={viewYear} month={viewMonth} holidayMap={holidayMap} />}

            {/* Legend */}
            <View style={styles.legend}>
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <View key={type} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={styles.legendText}>{type}</Text>
                </View>
              ))}
            </View>

            <SectionHeader
              title={`${monthHolidays.length} holidays this month`}
              onAdd={isAdmin ? openAdd : undefined}
            />

            {monthHolidays.length === 0 ? <EmptyState message="No holidays this month" /> : (
              monthHolidays.map((h: any) => (
                <ListRow
                  key={h.id}
                  title={h.title ?? h.name ?? `Holiday`}
                  subtitle={h.start_date + (h.end_date && h.end_date !== h.start_date ? ` – ${h.end_date}` : '')}
                  badge={h.holiday_type}
                  onEdit={isAdmin ? () => openEdit(h) : undefined}
                  onDelete={isAdmin ? () => remove(h.id) : undefined}
                />
              ))
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <FormModal visible={showModal} title={editingId ? 'Edit Holiday' : 'Add Holiday'} onClose={() => setShowModal(false)} onSave={save} saving={saving}>
        <FormField label="Holiday Title" required>
          <StyledInput value={form.title ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="e.g. Republic Day" />
        </FormField>
        <FormField label="Holiday Type">
          <SimpleSelect options={HOLIDAY_TYPES} value={form.holiday_type ?? 'national'} onChange={(v) => setForm((f) => ({ ...f, holiday_type: v }))} />
        </FormField>
        <FormField label="Start Date" required>
          <StyledInput value={form.start_date ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, start_date: v }))} placeholder="YYYY-MM-DD" />
        </FormField>
        <FormField label="End Date">
          <StyledInput value={form.end_date ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, end_date: v }))} placeholder="YYYY-MM-DD (optional)" />
        </FormField>
        <FormField label="Description">
          <StyledInput value={form.description ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} multiline />
        </FormField>
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    backgroundColor: '#fff',
    gap: 8,
  },
  navBtn: {
    padding: 6,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray[800],
    minWidth: 120,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  dowCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dowText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray[500],
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    marginVertical: 1,
  },
  todayCell: {
    backgroundColor: COLORS.primary + '22',
  },
  dayText: {
    fontSize: 13,
    color: COLORS.gray[800],
  },
  todayText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.gray[600],
    textTransform: 'capitalize',
  },
});
