import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { getDefaultDateRange } from '../../core/utils/analyticsUiUtils';

interface Props {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onApply: () => void;
  onClear: () => void;
  onRefresh: () => void;
  loading?: boolean;
  colors: { primary: string; card: string; border: string; text: string; textSecondary: string; background: string };
}

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseDate(s: string): Date {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default function AnalyticsDateFilter({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onApply,
  onClear,
  onRefresh,
  loading,
  colors,
}: Props) {
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const defaults = getDefaultDateRange();
  const isCustom = startDate !== defaults.from || endDate !== defaults.to;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
          onPress={() => setShowFrom(true)}
        >
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <View style={styles.dateTextRow}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>From</Text>
            <Text style={[styles.dateValue, { color: colors.text }]} numberOfLines={1}>
              {startDate || '—'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
          onPress={() => setShowTo(true)}
        >
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <View style={styles.dateTextRow}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>To</Text>
            <Text style={[styles.dateValue, { color: colors.text }]} numberOfLines={1}>
              {endDate || '—'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={onApply}>
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
        {isCustom ? (
          <TouchableOpacity style={[styles.clearBtn, { borderColor: colors.border }]} onPress={onClear}>
            <Ionicons name="close" size={14} color={colors.textSecondary} />
            <Text style={[styles.clearText, { color: colors.textSecondary }]}>Clear</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.border }]} onPress={onRefresh} disabled={loading}>
          <Ionicons name="refresh-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showFrom ? (
        <DateTimePicker
          value={parseDate(startDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowFrom(Platform.OS === 'ios');
            if (date) onStartChange(toIsoDate(date));
          }}
        />
      ) : null}
      {showTo ? (
        <DateTimePicker
          value={parseDate(endDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowTo(Platform.OS === 'ios');
            if (date) onEndChange(toIsoDate(date));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  dateTextRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  dateValue: { flex: 1, fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  applyBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  applyText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearText: { fontSize: 13, fontWeight: '600' },
  iconBtn: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
