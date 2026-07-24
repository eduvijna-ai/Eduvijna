/** SectionHeader — section title with optional leading icon + "View All ›". */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';

interface SectionHeaderProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, icon, actionLabel, onAction }: SectionHeaderProps) {
  const theme = useTeacherTheme();

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {icon ? <Ionicons name={icon} size={18} color={theme.colors.primary} /> : null}
        <Text
          style={[styles.title, { color: theme.colors.textPrimary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.action}
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={[styles.actionText, { color: theme.colors.primary }]}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={15} color={theme.colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  title: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
    paddingLeft: 4,
  },
  actionText: { fontSize: 13, fontWeight: '600' },
});
