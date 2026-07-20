import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import type { QuizAttemptStats } from '../../core/utils/teacherAnalyticsHelpers';

export type QuizAttemptFilterKey =
  | 'total_students'
  | 'completed'
  | 'pending'
  | 'missed'
  | 'not_started'
  | 'expired'
  | null;

interface ChipDef {
  key: QuizAttemptFilterKey;
  label: string;
  value: number;
  color: string;
}

interface Props {
  stats: QuizAttemptStats;
  active: QuizAttemptFilterKey;
  onChange: (key: QuizAttemptFilterKey) => void;
  colors: { card: string; border: string; text: string };
}

export default function QuizAttemptStatusChips({ stats, active, onChange, colors }: Props) {
  const chips: ChipDef[] = [
    { key: 'total_students', label: 'Total', value: stats.total, color: '#64748b' },
    { key: 'missed', label: 'Missed', value: stats.missed, color: '#dc2626' },
    { key: 'completed', label: 'Completed', value: stats.completed, color: '#059669' },
    { key: 'pending', label: 'Pending', value: stats.pending, color: '#d97706' },
    { key: 'not_started', label: 'Not Started', value: stats.not_started, color: '#2563eb' },
    { key: 'expired', label: 'Expired', value: stats.expired, color: '#94a3b8' },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips.map((chip) => {
        const isActive = active === chip.key || (!active && chip.key === 'total_students');
        return (
          <TouchableOpacity
            key={chip.key!}
            style={[
              styles.chip,
              {
                borderColor: isActive ? chip.color : colors.border,
                backgroundColor: isActive ? `${chip.color}18` : colors.card,
              },
            ]}
            onPress={() => onChange(active === chip.key ? null : chip.key)}
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
  row: { gap: 8, paddingVertical: 4 },
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
