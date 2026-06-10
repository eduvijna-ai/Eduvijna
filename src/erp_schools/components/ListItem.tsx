/** ListItem — leading (avatar/icon) · title/subtitle · trailing slot. */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import { accentColors, type AccentKey } from '../theme/accents';
import { Avatar } from './Avatar';

interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Render an avatar from a name. */
  avatarName?: string;
  avatarUrl?: string;
  /** Or render an icon bubble. */
  icon?: keyof typeof Ionicons.glyphMap;
  iconAccent?: AccentKey;
  leadingLabel?: string;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  divider?: boolean;
}

export function ListItem({
  title,
  subtitle,
  avatarName,
  avatarUrl,
  icon,
  iconAccent = 'teal',
  leadingLabel,
  trailing,
  showChevron = false,
  onPress,
  divider = true,
}: ListItemProps) {
  const theme = useTeacherTheme();
  const accent = accentColors(theme.colors, iconAccent);

  const content = (
    <View
      style={[
        styles.row,
        divider && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      {avatarName != null ? <Avatar name={avatarName} uri={avatarUrl} size={40} /> : null}
      {icon != null ? (
        <View style={[styles.iconWrap, { backgroundColor: accent.bg }]}>
          <Ionicons name={icon} size={20} color={accent.fg} />
        </View>
      ) : null}
      {leadingLabel != null ? (
        <View style={[styles.iconWrap, { backgroundColor: accent.bg }]}>
          <Text style={[styles.leadingLabel, { color: accent.fg }]}>{leadingLabel}</Text>
        </View>
      ) : null}

      <View style={styles.texts}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing}
      {showChevron ? <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={title}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  leadingLabel: { fontSize: 13, fontWeight: '800' },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 13 },
});
