/** Avatar — photo or color-derived initials fallback. */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import { accentColors, type AccentKey } from '../theme/accents';

interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
  accent?: AccentKey;
}

const ACCENT_CYCLE: AccentKey[] = ['teal', 'blue', 'green', 'orange', 'purple', 'pink'];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function accentForName(name: string): AccentKey {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i)) % ACCENT_CYCLE.length;
  return ACCENT_CYCLE[hash];
}

export function Avatar({ name, uri, size = 44, accent }: AvatarProps) {
  const theme = useTeacherTheme();
  const radius = size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: theme.colors.surfaceAlt }}
        accessibilityIgnoresInvertColors
      />
    );
  }

  const { bg, fg } = accentColors(theme.colors, accent ?? accentForName(name));
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius, backgroundColor: bg },
      ]}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: size * 0.38 }}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
