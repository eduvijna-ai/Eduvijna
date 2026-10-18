import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  formatAnalyticsDateStateAccessibility,
  isAnalyticsAllTime,
} from '../../core/utils/analyticsDateState';

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
  const allTime = isAnalyticsAllTime(startDate, endDate);
  const analyticsDateStateLabel = formatAnalyticsDateStateAccessibility(startDate, endDate);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Text
        testID="analytics-date-state"
        accessibilityLabel={analyticsDateStateLabel}
        accessible
        style={styles.dateStateMarker}
      >
        {' '}
      </Text>
      {allTime ? (
        <Text
          testID="analytics-date-all-time-label"
          accessibilityLabel="Analytics showing all time"
          style={[styles.allTimeBanner, { color: colors.textSecondary }]}
        >
          All time — no created_from / created_to filter (matches Assessments All Time)
        </Text>
      ) : null}
      <View style={styles.row}>
        <View style={[styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <View style={styles.dateTextRow}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>From</Text>
            <TextInput
              testID="analytics-date-from-input"
              accessibilityLabel="Analytics date from"
              value={startDate}
              onChangeText={onStartChange}
              placeholder={allTime ? 'All time' : 'YYYY-MM-DD'}
              placeholderTextColor={colors.textSecondary}
              style={[styles.dateInput, { color: colors.text }]}
              {...(Platform.OS === 'web' ? ({ type: 'date' } as Record<string, string>) : {})}
            />
          </View>
          {Platform.OS !== 'web' ? (
            <TouchableOpacity onPress={() => setShowFrom(true)} accessibilityLabel="Open from date picker">
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={[styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <View style={styles.dateTextRow}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>To</Text>
            <TextInput
              testID="analytics-date-to-input"
              accessibilityLabel="Analytics date to"
              value={endDate}
              onChangeText={onEndChange}
              placeholder={allTime ? 'All time' : 'YYYY-MM-DD'}
              placeholderTextColor={colors.textSecondary}
              style={[styles.dateInput, { color: colors.text }]}
              {...(Platform.OS === 'web' ? ({ type: 'date' } as Record<string, string>) : {})}
            />
          </View>
          {Platform.OS !== 'web' ? (
            <TouchableOpacity onPress={() => setShowTo(true)} accessibilityLabel="Open to date picker">
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          testID="analytics-date-apply"
          accessibilityRole="button"
          accessibilityLabel="Apply analytics date range"
          style={[styles.applyBtn, { backgroundColor: colors.primary }]}
          onPress={onApply}
        >
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
        {!allTime ? (
          <TouchableOpacity
            testID="analytics-date-clear-all-time"
            accessibilityRole="button"
            accessibilityLabel="Clear to all time"
            style={[styles.clearBtn, { borderColor: colors.border }]}
            onPress={onClear}
          >
            <Ionicons name="close" size={14} color={colors.textSecondary} />
            <Text style={[styles.clearText, { color: colors.textSecondary }]}>All time</Text>
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
  dateStateMarker: {
    width: 1,
    height: 1,
    fontSize: 1,
    lineHeight: 1,
    color: 'transparent',
    opacity: 0.01,
    margin: 0,
    padding: 0,
  },
  wrap: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  allTimeBanner: { fontSize: 11, fontWeight: '600' },
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
  dateInput: { flex: 1, fontSize: 12, fontWeight: '700', paddingVertical: 0, minWidth: 96 },
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
