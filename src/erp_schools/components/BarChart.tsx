/** BarChart — simple SVG vertical bars with labels (assessment performance). */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTeacherTheme } from '../theme/useTeacherTheme';

export interface BarDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  barColor?: string;
}

export function BarChart({ data, height = 140, barColor }: BarChartProps) {
  const theme = useTeacherTheme();
  const max = Math.max(...data.map((d) => d.value), 1);
  const color = barColor ?? theme.colors.success;

  return (
    <View>
      <View style={[styles.plot, { height }]}>
        {data.map((datum) => (
          <View key={datum.label} style={styles.col}>
            <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{datum.value}</Text>
            <View
              style={{
                width: 26,
                height: Math.max(4, (datum.value / max) * (height - 28)),
                backgroundColor: color,
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
              }}
            />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {data.map((datum) => (
          <Text key={datum.label} style={[styles.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {datum.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  col: { alignItems: 'center', justifyContent: 'flex-end', gap: 4, flex: 1 },
  value: { fontSize: 11, fontWeight: '700' },
  labels: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 6 },
  label: { fontSize: 9, flex: 1, textAlign: 'center' },
});
