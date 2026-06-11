/** QuickActionGrid — tap-tile grid (icon bubble + label), DESIGN.md "Quick Actions". */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import { accentColors, type AccentKey } from '../theme/accents';

export interface QuickAction {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent: AccentKey;
  onPress: () => void;
}

interface QuickActionGridProps {
  actions: QuickAction[];
  columns?: number;
}

export function QuickActionGrid({ actions, columns = 4 }: QuickActionGridProps) {
  const theme = useTeacherTheme();
  const width = `${100 / columns - 3}%` as `${number}%`;

  return (
    <View style={styles.grid}>
      {actions.map((action) => {
        const accent = accentColors(theme.colors, action.accent);
        return (
          <TouchableOpacity
            key={action.key}
            style={[
              styles.tile,
              theme.shadow.light,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.card, width },
            ]}
            onPress={action.onPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View style={[styles.iconWrap, { backgroundColor: accent.bg }]}>
              <Ionicons name={action.icon} size={22} color={accent.fg} />
            </View>
            <Text
              style={[styles.label, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: {
    minHeight: 96,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
});
