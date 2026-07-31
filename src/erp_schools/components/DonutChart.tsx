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

  // Keep the center label fully inside the donut hole so long values
  // (e.g. "₹15.15L") never touch the ring. Scale type to chart size —
  // module-overview donuts are ~64px and need smaller center text.
  const holeDiameter = Math.max(0, size - strokeWidth * 2 - 8);
  const valueFont = Math.max(10, Math.round(size * 0.17));
  const labelFont = Math.max(7, Math.round(size * 0.08));

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
          <View style={{ width: holeDiameter, alignItems: 'center' }}>
            {centerValue ? (
              <Text
                style={[
                  styles.value,
                  { color: theme.colors.textPrimary, fontSize: valueFont },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.55}
              >
                {centerValue}
              </Text>
            ) : null}
            {centerLabel ? (
              <Text
                style={[
                  styles.label,
                  { color: theme.colors.textSecondary, fontSize: labelFont },
                ]}
                numberOfLines={1}
              >
                {centerLabel}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  value: { fontWeight: '800' },
  label: { marginTop: 1 },
});
