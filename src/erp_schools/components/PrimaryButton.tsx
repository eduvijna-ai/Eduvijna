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
  /** Compact auto-width CTA (e.g. “Add Guardian”) — avoids clipped label text. */
  size?: 'default' | 'compact';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = 'solid',
  size = 'default',
  loading = false,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const theme = useTeacherTheme();
  const isOutline = variant === 'outline';
  const isCompact = size === 'compact';
  const contentColor = isOutline ? theme.colors.primary : theme.colors.textInverse;

  const inner = (
    <View style={[styles.content, isCompact && styles.contentCompact]}>
      {loading ? (
        <ActivityIndicator size="small" color={contentColor} />
      ) : (
        <>
          {icon ? (
            <Ionicons name={icon} size={isCompact ? 16 : 18} color={contentColor} />
          ) : null}
          <Text
            style={[
              styles.label,
              isCompact && styles.labelCompact,
              { color: contentColor },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  );

  const sizeStyle = isCompact ? styles.compact : styles.base;

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[
          sizeStyle,
          !isCompact && styles.stretchPressable,
          {
            borderRadius: theme.radius.button,
            overflow: 'hidden',
            opacity: disabled ? 0.6 : 1,
          },
          isCompact && styles.compactWrap,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Gradient
          colors={theme.gradients.hero}
          direction="horizontal"
          borderRadius={0}
          style={StyleSheet.absoluteFillObject}
        />
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        sizeStyle,
        !isCompact && styles.stretchPressable,
        {
          borderRadius: theme.radius.button,
          backgroundColor: isOutline ? 'transparent' : theme.colors.primary,
          borderWidth: isOutline ? 1.5 : 0,
          borderColor: theme.colors.primary,
          opacity: disabled ? 0.6 : 1,
        },
        isCompact && styles.compactWrap,
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
  // TouchableOpacity defaults to alignItems:'center', which shrinks gradient children
  // to content width — override so CTAs fill the footer.
  stretchPressable: {
    alignSelf: 'stretch',
    width: '100%',
  },
  base: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  compact: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  compactWrap: {
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contentCompact: { gap: 6 },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  labelCompact: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
});
