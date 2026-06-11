/** SegmentedControl — 2+ way toggle (e.g. Payroll / Leave). */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';

export interface Segment {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SegmentedControlProps {
  segments: Segment[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function SegmentedControl({ segments, activeKey, onChange }: SegmentedControlProps) {
  const theme = useTeacherTheme();
  return (
    <View
      style={[
        styles.track,
        { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.button },
      ]}
    >
      {segments.map((segment) => {
        const active = segment.key === activeKey;
        return (
          <TouchableOpacity
            key={segment.key}
            style={[
              styles.segment,
              { borderRadius: theme.radius.button - 2 },
              active && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => onChange(segment.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={segment.label}
          >
            {segment.icon ? (
              <Ionicons
                name={segment.icon}
                size={16}
                color={active ? theme.colors.textInverse : theme.colors.textSecondary}
              />
            ) : null}
            <Text
              style={[
                styles.label,
                { color: active ? theme.colors.textInverse : theme.colors.textSecondary },
              ]}
            >
              {segment.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, gap: 4 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
  },
  label: { fontSize: 14, fontWeight: '700' },
});
