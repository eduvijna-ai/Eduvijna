/** StatCard + StatGrid — tinted metric tiles (DESIGN.md "Overview Metrics"). */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import { accentColors, type AccentKey } from '../theme/accents';
import type { Trend } from '../types/domain';

export interface StatItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  accent: AccentKey;
  trend?: Trend;
  /** When true the icon sits in a filled bubble (overview-metric look). */
  filledIcon?: boolean;
  onPress?: () => void;
}

interface StatCardProps {
  item: StatItem;
  /** number of columns the parent grid uses; controls flex-basis */
  columns?: number;
  variant?: 'plain' | 'tinted';
}

export function StatCard({ item, columns = 4, variant = 'plain' }: StatCardProps) {
  const theme = useTeacherTheme();
  const accent = accentColors(theme.colors, item.accent);
  const trendColor =
    item.trend?.direction === 'down' ? theme.colors.danger : theme.colors.success;

  const content = (
    <>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: variant === 'tinted' ? theme.colors.surface : accent.bg },
        ]}
      >
        <Ionicons name={item.icon} size={20} color={accent.fg} />
      </View>
      <Text style={[styles.value, { color: theme.colors.textPrimary }]} numberOfLines={1}>
        {item.value}
      </Text>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]} numberOfLines={2}>
        {item.label}
      </Text>
      {item.trend ? (
        <View style={styles.trendRow}>
          <Ionicons
            name={item.trend.direction === 'down' ? 'arrow-down' : 'arrow-up'}
            size={11}
            color={trendColor}
          />
          <Text style={[styles.trendText, { color: trendColor }]} numberOfLines={1}>
            {item.trend.label}
          </Text>
        </View>
      ) : null}
    </>
  );

  const cardStyle = [
    styles.card,
    theme.shadow.light,
    {
      backgroundColor: variant === 'tinted' ? accent.bg : theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.card,
      width: `${100 / columns - 2}%` as `${number}%`,
    },
  ];

  if (item.onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={item.onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={item.label}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{content}</View>;
}

interface StatGridProps {
  items: StatItem[];
  columns?: number;
  variant?: 'plain' | 'tinted';
}

export function StatGrid({ items, columns = 4, variant = 'plain' }: StatGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <StatCard key={item.key} item={item} columns={columns} variant={variant} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  trendText: { fontSize: 10, fontWeight: '600' },
});
