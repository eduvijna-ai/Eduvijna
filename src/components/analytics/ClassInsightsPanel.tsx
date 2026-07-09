import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ClassInsight } from '../../core/utils/teacherAnalyticsHelpers';

const INSIGHT_STYLES = {
  success: { bg: '#ecfdf5', border: '#a7f3d0', icon: 'checkmark-circle' as const, color: '#065f46' },
  warning: { bg: '#fffbeb', border: '#fde68a', icon: 'warning' as const, color: '#92400e' },
  danger: { bg: '#fef2f2', border: '#fecaca', icon: 'close-circle' as const, color: '#991b1b' },
  info: { bg: '#eff6ff', border: '#bfdbfe', icon: 'pulse' as const, color: '#1e40af' },
};

interface Props {
  insights: ClassInsight[];
}

export default function ClassInsightsPanel({ insights }: Props) {
  if (!insights.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Key Insights</Text>
      {insights.map((insight, i) => {
        const s = INSIGHT_STYLES[insight.type];
        return (
          <View key={i} style={[styles.item, { backgroundColor: s.bg, borderColor: s.border }]}>
            <Ionicons name={s.icon} size={16} color={s.color} />
            <Text style={[styles.text, { color: s.color }]}>{insight.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  text: { flex: 1, fontSize: 12, lineHeight: 18 },
});
