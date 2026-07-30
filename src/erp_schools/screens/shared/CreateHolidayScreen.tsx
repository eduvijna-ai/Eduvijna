/**
 * Create / Edit Holiday — web HolidayCalendarTab modal parity.
 * Fields: name, type, start/end date, description, hex color.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  FormField,
  TextField,
  SelectField,
  PrimaryButton,
  ScreenLoader,
} from '../../components';
import { useTeacherTheme } from '../../theme/useTeacherTheme';
import { useHolidayCalendarData } from '../../hooks/useHolidayCalendarData';
import {
  DEFAULT_HOLIDAY_COLOR,
  HOLIDAY_COLOR_PRESETS,
  HOLIDAY_TYPES,
  isValidHexColor,
  normalizeHexColor,
} from '../../utils/holidayMeta';
import { toLocalDateStr } from '../../utils/apiHelpers';

type Params = { CreateHoliday: { holidayId?: number } };
type Nav = NativeStackNavigationProp<Params>;
type DateFieldKey = 'start' | 'end';

const TYPE_OPTIONS = HOLIDAY_TYPES.map((t) => ({
  label: t.charAt(0).toUpperCase() + t.slice(1),
  value: t,
}));

function parseYmd(ymd: string, fallback = new Date()): Date {
  if (!ymd || ymd.length < 10) return fallback;
  const d = new Date(`${ymd.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function toYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDisplayYmd(ymd: string): string {
  if (!ymd) return 'Select date';
  const d = parseYmd(ymd);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function CreateHolidayScreen() {
  const theme = useTeacherTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<Params, 'CreateHoliday'>>();
  const { createHoliday, updateHoliday, getHoliday, saving, year, canManage } =
    useHolidayCalendarData();

  const editingId = route.params?.holidayId;
  const isEdit = editingId != null && editingId > 0;

  const [loading, setLoading] = useState(Boolean(isEdit));
  const [name, setName] = useState('');
  const [holidayType, setHolidayType] = useState('national');
  const [startDate, setStartDate] = useState(`${year}-01-01`);
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [picking, setPicking] = useState<DateFieldKey | null>(null);

  useEffect(() => {
    if (!canManage) {
      Alert.alert('Holidays', 'Students can view holidays but cannot add or edit them.');
      navigation.goBack();
    }
  }, [canManage, navigation]);

  useEffect(() => {
    if (!canManage || !isEdit || !editingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const h = await getHoliday(editingId);
      if (cancelled) return;
      if (h) {
        setName(h.name);
        setHolidayType(h.holidayType || 'national');
        setStartDate(h.startDate || toLocalDateStr());
        setEndDate(h.endDate || '');
        setDescription(h.description || '');
        setColor(h.color || '');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage, isEdit, editingId, getHoliday]);

  const previewColor =
    (color && isValidHexColor(color.startsWith('#') ? color : `#${color}`)
      ? color.startsWith('#')
        ? color
        : `#${color}`
      : null) || DEFAULT_HOLIDAY_COLOR;

  const onPickDate = (key: DateFieldKey, date?: Date) => {
    if (Platform.OS !== 'ios') setPicking(null);
    if (!date) return;
    const ymd = toYmd(date);
    if (key === 'start') setStartDate(ymd);
    else setEndDate(ymd);
  };

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Holiday name is required.');
      return;
    }
    if (!startDate.trim()) {
      Alert.alert('Required', 'Start date is required.');
      return;
    }
    if (color.trim()) {
      const norm = normalizeHexColor(color);
      if (!norm) {
        Alert.alert('Invalid color', 'Use a hex color like #e53e3e.');
        return;
      }
    }
    if (endDate.trim() && endDate < startDate) {
      Alert.alert('Invalid dates', 'End date must be on or after start date.');
      return;
    }

    const payload = {
      name: name.trim(),
      holiday_type: holidayType,
      start_date: startDate.trim(),
      end_date: endDate.trim() || null,
      description: description.trim() || null,
      color: color.trim() || null,
    };

    const ok = isEdit
      ? await updateHoliday(editingId!, payload)
      : await createHoliday(payload);

    if (!ok) {
      Alert.alert('Save failed', 'Could not save holiday. Please try again.');
      return;
    }
    navigation.goBack();
  };

  if (!canManage) {
    return (
      <TeacherScreen header={<ScreenHeader title="Holiday" showBack />}>
        <ScreenLoader message="Returning…" />
      </TeacherScreen>
    );
  }

  if (loading) {
    return (
      <TeacherScreen header={<ScreenHeader title={isEdit ? 'Edit Holiday' : 'Add Holiday'} />}>
        <ScreenLoader message="Loading holiday…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title={isEdit ? 'Edit Holiday' : 'Add Holiday'} />}
      contentStyle={styles.content}
      footer={
        <View style={styles.footerRow}>
          <PrimaryButton
            label="Cancel"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label={saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            icon="checkmark-outline"
            disabled={saving}
            onPress={() => void onSave()}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <SurfaceCard>
        <View style={styles.form}>
          <FormField label="Holiday Name" required>
            <TextField
              value={name}
              onChangeText={setName}
              placeholder="e.g. Republic Day"
            />
          </FormField>

          <FormField label="Type" required>
            <SelectField
              options={TYPE_OPTIONS}
              value={holidayType}
              onChange={setHolidayType}
            />
          </FormField>

          <FormField label="Start Date" required>
            <TouchableOpacity
              style={[styles.dateBtn, { borderColor: theme.colors.border }]}
              onPress={() => setPicking('start')}
            >
              <Text style={[styles.dateValue, { color: theme.colors.textPrimary }]}>
                {formatDisplayYmd(startDate)}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </FormField>

          <FormField label="End Date" hint="Optional — leave blank for a single-day holiday">
            <View style={styles.endDateRow}>
              <TouchableOpacity
                style={[styles.dateBtn, styles.flex1, { borderColor: theme.colors.border }]}
                onPress={() => setPicking('end')}
              >
                <Text
                  style={[
                    styles.dateValue,
                    { color: endDate ? theme.colors.textPrimary : theme.colors.textSecondary },
                  ]}
                >
                  {endDate ? formatDisplayYmd(endDate) : 'Optional'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {endDate ? (
                <TouchableOpacity
                  style={[styles.clearDateBtn, { borderColor: theme.colors.border }]}
                  onPress={() => setEndDate('')}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary }}>
                    Clear
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </FormField>

          {picking ? (
            <DateTimePicker
              value={parseYmd(picking === 'start' ? startDate : endDate || startDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => onPickDate(picking, date)}
            />
          ) : null}

          {Platform.OS === 'ios' && picking ? (
            <PrimaryButton
              label="Done"
              size="compact"
              variant="outline"
              onPress={() => setPicking(null)}
            />
          ) : null}

          <FormField label="Description">
            <TextField
              value={description}
              onChangeText={setDescription}
              placeholder="Optional description…"
              multiline
            />
          </FormField>

          <FormField label="Color (hex)" hint="Optional — used for calendar tagging">
            <View style={styles.colorRow}>
              <View style={[styles.swatchPreview, { backgroundColor: previewColor }]} />
              <View style={styles.flex1}>
                <TextField
                  value={color}
                  onChangeText={setColor}
                  placeholder="#e53e3e (optional)"
                />
              </View>
            </View>
          </FormField>

          <Text style={[styles.presetsLabel, { color: theme.colors.textSecondary }]}>
            Quick colors
          </Text>
          <View style={styles.presets}>
            {HOLIDAY_COLOR_PRESETS.map((hex) => {
              const active = normalizeHexColor(color) === hex;
              return (
                <TouchableOpacity
                  key={hex}
                  style={[
                    styles.preset,
                    { backgroundColor: hex },
                    active && { borderColor: theme.colors.textPrimary, borderWidth: 2 },
                  ]}
                  onPress={() => setColor(hex)}
                  accessibilityLabel={`Color ${hex}`}
                />
              );
            })}
            <TouchableOpacity
              style={[
                styles.presetClear,
                { borderColor: theme.colors.border },
              ]}
              onPress={() => setColor('')}
            >
              <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: '700' }}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  form: { gap: 4 },
  flex1: { flex: 1 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  dateValue: { fontSize: 14, fontWeight: '600' },
  endDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearDateBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatchPreview: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  presetsLabel: { fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  preset: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  presetClear: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: { flexDirection: 'row', gap: 10 },
});
