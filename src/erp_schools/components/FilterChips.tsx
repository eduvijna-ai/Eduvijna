/** FilterChips — horizontally-scrolling filter pills. */

import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTeacherTheme } from '../theme/useTeacherTheme';

export interface ChipOption {
  key: string;
  label: string;
}

interface FilterChipsProps {
  options: ChipOption[];
  activeKey: string;
  onChange: (key: string) => void;
  /** sm = status filters · md = default · lg = module tabs */
  size?: 'sm' | 'md' | 'lg';
}

export function FilterChips({
  options,
  activeKey,
  onChange,
  size = 'md',
}: FilterChipsProps) {
  const theme = useTeacherTheme();
  const dims =
    size === 'lg'
      ? { height: 40, padH: 18, font: 14, weight: '700' as const }
      : size === 'sm'
        ? { height: 32, padH: 12, font: 12, weight: '600' as const }
        : { height: 34, padH: 14, font: 13, weight: '600' as const };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const active = option.key === activeKey;
        return (
          <TouchableOpacity
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[
              styles.chip,
              {
                height: dims.height,
                paddingHorizontal: dims.padH,
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                borderColor: active ? theme.colors.primary : theme.colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
          >
            <Text
              style={{
                fontSize: dims.font,
                fontWeight: dims.weight,
                color: active ? theme.colors.textInverse : theme.colors.textSecondary,
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
