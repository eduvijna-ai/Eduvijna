import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onRefresh: () => void;
  loading?: boolean;
  colors: { primary: string; card: string; border: string; text: string; textSecondary: string };
  showChartToggle?: boolean;
  chartView?: boolean;
  onToggleChart?: () => void;
}

export default function AnalyticsToolbar({
  startDate,
  endDate,
  onRefresh,
  loading,
  colors,
  showChartToggle,
  chartView,
  onToggleChart,
}: Props) {
  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.dateText, { color: colors.text }]}>
          {startDate} → {endDate}
        </Text>
      </View>
      <View style={styles.actions}>
        {showChartToggle && onToggleChart ? (
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: chartView ? colors.primary : 'transparent' }]}
            onPress={onToggleChart}
          >
            <Ionicons name="bar-chart-outline" size={18} color={chartView ? '#fff' : colors.primary} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.iconBtn, { borderColor: colors.border }]}
          onPress={onRefresh}
          disabled={loading}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  dateText: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
