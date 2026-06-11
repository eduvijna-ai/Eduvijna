/** ProgressBar — single or multi-segment horizontal progress. */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTeacherTheme } from '../theme/useTeacherTheme';

export interface ProgressSegment {
  /** 0..100 portion of the bar */
  percent: number;
  color: string;
}

interface ProgressBarProps {
  /** Single-value percent (0..100). Ignored when `segments` is provided. */
  percent?: number;
  color?: string;
  segments?: ProgressSegment[];
  height?: number;
}

export function ProgressBar({ percent = 0, color, segments, height = 8 }: ProgressBarProps) {
  const theme = useTeacherTheme();
  const fill = color ?? theme.colors.primary;

  return (
    <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt, height, borderRadius: height }]}>
      {segments ? (
        <View style={styles.segmentRow}>
          {segments.map((segment, index) => (
            <View
              key={`${segment.color}-${index}`}
              style={{ width: `${segment.percent}%`, backgroundColor: segment.color, height }}
            />
          ))}
        </View>
      ) : (
        <View
          style={{
            width: `${Math.max(0, Math.min(100, percent))}%`,
            backgroundColor: fill,
            height,
            borderRadius: height,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  segmentRow: { flexDirection: 'row', width: '100%', height: '100%' },
});
