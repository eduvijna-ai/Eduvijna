/** PrimaryButton — solid or gradient CTA with optional icon + loading state. */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import { Gradient } from './Gradient';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'solid' | 'gradient' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = 'solid',
  loading = false,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const theme = useTeacherTheme();
  const isOutline = variant === 'outline';
  const contentColor = isOutline ? theme.colors.primary : theme.colors.textInverse;

  const inner = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator size="small" color={contentColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={contentColor} /> : null}
          <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
        </>
      )}
    </View>
  );

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[{ opacity: disabled ? 0.6 : 1 }, style]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Gradient
          colors={theme.gradients.hero}
          direction="horizontal"
          borderRadius={theme.radius.button}
          style={styles.base}
        >
          {inner}
        </Gradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.base,
        {
          borderRadius: theme.radius.button,
          backgroundColor: isOutline ? 'transparent' : theme.colors.primary,
          borderWidth: isOutline ? 1.5 : 0,
          borderColor: theme.colors.primary,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { height: 52, alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontSize: 16, fontWeight: '700' },
});
