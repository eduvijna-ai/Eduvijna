/** SurfaceCard — generic elevated surface used across screens. */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTeacherTheme } from '../theme/useTeacherTheme';

interface SurfaceCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  accessibilityLabel?: string;
}

export function SurfaceCard({
  children,
  style,
  onPress,
  padded = true,
  accessibilityLabel,
}: SurfaceCardProps) {
  const theme = useTeacherTheme();

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    theme.shadow.light,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.card,
      padding: padded ? theme.spacing.md : 0,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
