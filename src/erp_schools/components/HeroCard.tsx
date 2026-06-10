/**
 * HeroCard — gradient banner used at the top of dashboards (DESIGN.md "Hero Card").
 * Renders a teal gradient with a decorative motif and arbitrary children.
 */

import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import { Gradient } from './Gradient';

interface HeroCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  motif?: boolean;
}

export function HeroCard({ children, style, motif = true }: HeroCardProps) {
  const theme = useTeacherTheme();
  const colors = theme.isDark ? theme.gradients.heroDark : theme.gradients.hero;

  return (
    <Gradient
      colors={colors}
      direction="diagonal"
      borderRadius={theme.radius.card}
      style={[styles.card, theme.shadow.medium, style]}
    >
      {motif ? (
        <Ionicons
          name="leaf-outline"
          size={150}
          color="rgba(255,255,255,0.08)"
          style={styles.motif}
        />
      ) : null}
      <View style={styles.content}>{children}</View>
    </Gradient>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 96 },
  content: { padding: 20 },
  motif: { position: 'absolute', right: -20, top: -20 },
});
