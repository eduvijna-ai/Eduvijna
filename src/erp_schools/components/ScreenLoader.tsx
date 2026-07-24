/** ScreenLoader — centered activity indicator for boot / fetch waits. */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTeacherTheme } from '../theme/useTeacherTheme';

type Props = {
  message?: string;
  /** Fill available space (full-screen placeholder). */
  fill?: boolean;
};

export function ScreenLoader({ message = 'Loading…', fill = true }: Props) {
  const theme = useTeacherTheme();
  return (
    <View style={[styles.wrap, fill && styles.fill]} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message ? (
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  fill: {
    flexGrow: 1,
    minHeight: 220,
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
  },
});
