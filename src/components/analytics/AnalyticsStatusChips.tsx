import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import type { StatusSummary } from '../../core/types/quizAnalytics.types';

export type StatusFilterKey = keyof StatusSummary | 'total' | null;

interface ChipDef {
  key: StatusFilterKey;
  label: string;
  value: number;
  color: string;
}

interface Props {
  summary: StatusSummary & { total?: number };
  active: StatusFilterKey;
  onChange: (key: StatusFilterKey) => void;
  colors: { card: string; border: string; text: string; primary: string };
  includeTotal?: boolean;
}

export default function AnalyticsStatusChips({ summary, active, onChange, colors, includeTotal = true }: Props) {
  const chips: ChipDef[] = [
    ...(includeTotal ? [{ key: 'total' as const, label: 'All', value: summary.total ?? 0, color: '#64748b' }] : []),
    { key: 'completed', label: 'Completed', value: summary.completed, color: '#059669' },
    { key: 'pending', label: 'Pending', value: summary.pending, color: '#d97706' },
    { key: 'missed', label: 'Missed', value: summary.missed, color: '#dc2626' },
    { key: 'active', label: 'Active', value: summary.active, color: '#2563eb' },
    { key: 'expired', label: 'Expired', value: summary.expired, color: '#94a3b8' },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips.map((chip) => {
        const isActive = active === chip.key;
        return (
          <TouchableOpacity
            key={String(chip.key)}
            style={[
              styles.chip,
              { borderColor: isActive ? chip.color : colors.border, backgroundColor: isActive ? `${chip.color}18` : colors.card },
            ]}
            onPress={() => onChange(isActive ? null : chip.key)}
          >
            <Text style={[styles.chipLabel, { color: isActive ? chip.color : colors.text }]}>{chip.label}</Text>
            <Text style={[styles.chipValue, { color: chip.color }]}>{chip.value}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  chipValue: { fontSize: 12, fontWeight: '800' },
});
