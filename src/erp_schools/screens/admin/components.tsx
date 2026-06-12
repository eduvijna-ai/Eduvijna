/**
 * Admin-local composite views, built ENTIRELY from the shared ERP Schools
 * component primitives (ProgressBar, DonutChart, Ionicons). These are module-
 * local (not added to the shared barrel) because they encode admin-specific
 * layouts that recur across many admin screens — keeping screens DRY without
 * leaking admin concerns into the shared design system.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar, DonutChart, Badge, ListItem } from '../../components';
import { useTeacherTheme } from '../../theme/useTeacherTheme';
import { distributionColor } from './adminVisuals';
import type { AccentKey } from '../../theme/accents';
import type { DistributionRow, CriteriaRow, RankedRow, PersonStatus, OpsListRow } from '../../types/admin';

const PERSON_STATUS_META: Record<PersonStatus, { label: string; accent: AccentKey }> = {
  active: { label: 'Active', accent: 'green' },
  absent: { label: 'Absent', accent: 'red' },
  leave: { label: 'On Leave', accent: 'orange' },
  inactive: { label: 'Inactive', accent: 'red' },
};

/** Status badge for a directory person (active / absent / leave / inactive). */
export function PersonStatusBadge({ status, label }: { status: PersonStatus; label?: string }) {
  const meta = PERSON_STATUS_META[status];
  return <Badge label={label ?? meta.label} accent={meta.accent} />;
}

/** Rows of `label · value` with a progress bar (subject perf, distributions). */
export function DistributionList({ rows }: { rows: DistributionRow[] }) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.group}>
      {rows.map((row) => (
        <View key={row.id} style={styles.distRow}>
          <View style={styles.distHeader}>
            <Text style={[styles.distLabel, { color: theme.colors.textPrimary }]} numberOfLines={1}>{row.label}</Text>
            <Text style={[styles.distValue, { color: theme.colors.textSecondary }]}>{row.value}</Text>
          </View>
          <ProgressBar percent={row.percent} color={distributionColor(theme.colors, row.color)} />
        </View>
      ))}
    </View>
  );
}

/** Donut + colored legend rows (attendance / finance / grade distribution). */
export function DonutLegend({
  rows,
  centerValue,
  centerLabel,
}: {
  rows: DistributionRow[];
  centerValue?: string;
  centerLabel?: string;
}) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.donutWrap}>
      <DonutChart
        segments={rows.map((r) => ({ value: r.percent, color: distributionColor(theme.colors, r.color) }))}
        size={132}
        strokeWidth={16}
        centerValue={centerValue}
        centerLabel={centerLabel}
      />
      <View style={styles.legend}>
        {rows.map((row) => (
          <View key={row.id} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: distributionColor(theme.colors, row.color) }]} />
            <View style={styles.legendTexts}>
              <Text style={[styles.legendLabel, { color: theme.colors.textPrimary }]} numberOfLines={1}>{row.label}</Text>
              <Text style={[styles.legendValue, { color: theme.colors.textSecondary }]} numberOfLines={1}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Labelled criteria progress rows (teacher performance by criteria). */
export function CriteriaList({ rows }: { rows: CriteriaRow[] }) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.group}>
      {rows.map((row) => (
        <View key={row.id} style={styles.criteriaRow}>
          <Ionicons name={row.icon} size={16} color={theme.colors.primary} />
          <Text style={[styles.criteriaLabel, { color: theme.colors.textPrimary }]} numberOfLines={1}>{row.label}</Text>
          <View style={styles.criteriaBar}>
            <ProgressBar percent={row.percent} />
          </View>
          <Text style={[styles.criteriaValue, { color: theme.colors.textSecondary }]}>{row.percent}%</Text>
        </View>
      ))}
    </View>
  );
}

/** Ranked list with rank chip, label, value and trend arrow (top classes, class-wise attendance). */
export function RankedList({ rows }: { rows: RankedRow[] }) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.group}>
      {rows.map((row, index) => {
        const trendColor = row.trend.direction === 'down' ? theme.colors.danger : theme.colors.success;
        return (
          <View
            key={row.id}
            style={[
              styles.rankRow,
              index < rows.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <View style={[styles.rankChip, { backgroundColor: theme.colors.tintTeal }]}>
              <Text style={[styles.rankText, { color: theme.colors.primary }]}>{row.rank}</Text>
            </View>
            <Text style={[styles.rankLabel, { color: theme.colors.textPrimary }]}>{row.label}</Text>
            <Text style={[styles.rankValue, { color: theme.colors.textPrimary }]}>{row.value}</Text>
            <View style={styles.rankTrend}>
              <Ionicons
                name={row.trend.direction === 'down' ? 'arrow-down' : row.trend.direction === 'up' ? 'arrow-up' : 'remove'}
                size={12}
                color={trendColor}
              />
              <Text style={[styles.rankTrendText, { color: trendColor }]} numberOfLines={1}>{row.trend.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Operations list — icon · title/subtitle · trailing value badge (library, transport, hostel, inventory). */
export function OpsList({ rows, onPressRow }: { rows: OpsListRow[]; onPressRow?: (row: OpsListRow) => void }) {
  return (
    <>
      {rows.map((row, index) => (
        <ListItem
          key={row.id}
          icon={row.icon}
          iconAccent={row.accent}
          title={row.title}
          subtitle={row.subtitle}
          divider={index < rows.length - 1}
          onPress={onPressRow ? () => onPressRow(row) : undefined}
          trailing={row.value ? <Badge label={row.value} accent={row.accent} /> : undefined}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: 12 },

  distRow: { gap: 6 },
  distHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  distLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  distValue: { fontSize: 12, fontWeight: '600' },

  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTexts: { flex: 1 },
  legendLabel: { fontSize: 12, fontWeight: '600' },
  legendValue: { fontSize: 11 },

  criteriaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  criteriaLabel: { fontSize: 12, fontWeight: '600', width: 96 },
  criteriaBar: { flex: 1 },
  criteriaValue: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },

  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rankChip: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '800' },
  rankLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  rankValue: { fontSize: 13, fontWeight: '700' },
  rankTrend: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 70, justifyContent: 'flex-end' },
  rankTrendText: { fontSize: 10, fontWeight: '600' },
});
