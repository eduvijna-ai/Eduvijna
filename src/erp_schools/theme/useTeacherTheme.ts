/**
 * useTeacherTheme
 *
 * Bridges the app's existing ThemeContext (for dark-mode state + persistence)
 * with the ERP Schools DESIGN.md token set. This is how the new module "extends
 * the existing design system" instead of inventing a separate styling approach.
 */

import { useMemo } from 'react';
import { useTheme } from '@context/ThemeContext';
import {
  teacherPalettes,
  teacherSpacing,
  teacherRadius,
  teacherTypography,
  teacherShadow,
  teacherGradients,
  type TeacherPalette,
} from './tokens';

export interface TeacherTheme {
  isDark: boolean;
  colors: TeacherPalette;
  spacing: typeof teacherSpacing;
  radius: typeof teacherRadius;
  typography: typeof teacherTypography;
  shadow: typeof teacherShadow;
  gradients: typeof teacherGradients;
}

export function useTeacherTheme(): TeacherTheme {
  const { isDark } = useTheme();

  return useMemo<TeacherTheme>(
    () => ({
      isDark,
      colors: isDark ? teacherPalettes.dark : teacherPalettes.light,
      spacing: teacherSpacing,
      radius: teacherRadius,
      typography: teacherTypography,
      shadow: teacherShadow,
      gradients: teacherGradients,
    }),
    [isDark],
  );
}
