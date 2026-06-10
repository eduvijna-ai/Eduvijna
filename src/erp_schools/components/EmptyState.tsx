/** EmptyState — illustration glyph · message · optional CTA (DESIGN.md). */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import { PrimaryButton } from './PrimaryButton';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  ctaLabel,
  onCtaPress,
}: EmptyStateProps) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.tintTeal }]}>
        <Ionicons name={icon} size={36} color={theme.colors.primary} />
      </View>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text> : null}
      {ctaLabel && onCtaPress ? (
        <PrimaryButton label={ctaLabel} onPress={onCtaPress} style={styles.cta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  cta: { marginTop: 12, alignSelf: 'stretch' },
});
