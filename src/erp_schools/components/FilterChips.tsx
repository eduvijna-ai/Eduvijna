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
}

export function FilterChips({ options, activeKey, onChange }: FilterChipsProps) {
  const theme = useTeacherTheme();
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
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                borderColor: active ? theme.colors.primary : theme.colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
          >
            <Text
              style={[
                styles.text,
                { color: active ? theme.colors.textInverse : theme.colors.textSecondary },
              ]}
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
  row: { gap: 8, paddingVertical: 2, paddingRight: 16 },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 13, fontWeight: '600' },
});
