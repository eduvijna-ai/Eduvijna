/** DonutChart — SVG donut with a centered label (attendance summary, etc.). */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTeacherTheme } from '../theme/useTeacherTheme';

export interface DonutSegment {
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerValue?: string;
  centerLabel?: string;
}

export function DonutChart({
  segments,
  size = 140,
  strokeWidth = 18,
  centerValue,
  centerLabel,
}: DonutChartProps) {
  const theme = useTeacherTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  let offsetAccum = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.surfaceAlt}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {segments.map((segment, index) => {
            const fraction = segment.value / total;
            const dash = fraction * circumference;
            const dashOffset = -offsetAccum * circumference;
            offsetAccum += fraction;
            return (
              <Circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
        </G>
      </Svg>
      {(centerValue || centerLabel) && (
        <View style={styles.center} pointerEvents="none">
          {centerValue ? (
            <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{centerValue}</Text>
          ) : null}
          {centerLabel ? (
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{centerLabel}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 24, fontWeight: '800' },
  label: { fontSize: 11, marginTop: 2 },
});
