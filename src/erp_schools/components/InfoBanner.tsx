/** InfoBanner — soft informational / tip banner with optional dismiss. */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';

interface InfoBannerProps {
  text: string;
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'info' | 'tip';
  onDismiss?: () => void;
}

export function InfoBanner({ text, title, icon, tone = 'info', onDismiss }: InfoBannerProps) {
  const theme = useTeacherTheme();
  const resolvedIcon = icon ?? (tone === 'tip' ? 'bulb-outline' : 'information-circle-outline');

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.colors.tintBlue, borderRadius: theme.radius.card },
      ]}
    >
      <Ionicons name={resolvedIcon} size={18} color={theme.colors.info} style={styles.icon} />
      <View style={styles.body}>
        {title ? <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text> : null}
        <Text style={[styles.text, { color: theme.colors.textSecondary }]}>{text}</Text>
      </View>
      {onDismiss ? (
        <TouchableOpacity onPress={onDismiss} accessibilityLabel="Dismiss" hitSlop={8}>
          <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  icon: { marginTop: 1 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontWeight: '700' },
  text: { fontSize: 13, lineHeight: 18 },
});
