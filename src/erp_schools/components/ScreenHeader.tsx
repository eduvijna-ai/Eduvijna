/** ScreenHeader — back arrow · centered title · optional trailing action. */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTeacherTheme } from '../theme/useTeacherTheme';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  onTrailingPress?: () => void;
  trailingAccessibilityLabel?: string;
}

export function ScreenHeader({
  title,
  onBack,
  showBack = true,
  trailingIcon,
  onTrailingPress,
  trailingAccessibilityLabel,
}: ScreenHeaderProps) {
  const theme = useTeacherTheme();
  const navigation = useNavigation();

  const handleBack = onBack ?? (() => navigation.goBack());

  return (
    <View style={[styles.row, { backgroundColor: theme.colors.background }]}>
      {showBack ? (
        <TouchableOpacity
          onPress={handleBack}
          style={styles.side}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.side} />
      )}

      <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
        {title}
      </Text>

      <TouchableOpacity
        onPress={onTrailingPress}
        style={styles.side}
        disabled={!trailingIcon}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={trailingAccessibilityLabel ?? 'More options'}
      >
        {trailingIcon ? (
          <Ionicons name={trailingIcon} size={22} color={theme.colors.textPrimary} />
        ) : (
          <View style={styles.side} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  side: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', paddingHorizontal: 4 },
});
