/**
 * ERP Schools — Design Tokens
 *
 * A single source of truth for the ERP Schools visual language, mapped directly
 * from DESIGN.md. These tokens EXTEND (never replace) the app's existing design
 * system: dark-mode awareness still comes from the shared ThemeContext
 * (see ./useTeacherTheme). Screens must consume these tokens via useTeacherTheme()
 * and never hard-code colors / sizes.
 */

export interface TeacherPalette {
  // Brand
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  // Semantic
  success: string;
  warning: string;
  danger: string;
  info: string;
  // Surfaces
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textInverse: string;
  // Misc
  overlay: string;
  shadow: string;
  // Soft tints (card backgrounds / icon bubbles)
  tintTeal: string;
  tintBlue: string;
  tintGreen: string;
  tintOrange: string;
  tintPurple: string;
  tintPink: string;
  tintRed: string;
  // On-tint icon colors
  onTintTeal: string;
  onTintBlue: string;
  onTintGreen: string;
  onTintOrange: string;
  onTintPurple: string;
  onTintPink: string;
  onTintRed: string;
}

const lightPalette: TeacherPalette = {
  primary: '#0B5563',
  primaryDark: '#083E49',
  secondary: '#0F6D7A',
  accent: '#12B3C7',

  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#0EA5E9',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',

  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textInverse: '#FFFFFF',

  overlay: 'rgba(15, 23, 42, 0.45)',
  shadow: '#0F172A',

  tintTeal: '#E6F3F5',
  tintBlue: '#E3F2FD',
  tintGreen: '#E8F5E9',
  tintOrange: '#FFF3E0',
  tintPurple: '#F3E5F5',
  tintPink: '#FCE7F3',
  tintRed: '#FEE2E2',

  onTintTeal: '#0B5563',
  onTintBlue: '#0891B2',
  onTintGreen: '#059669',
  onTintOrange: '#D97706',
  onTintPurple: '#9333EA',
  onTintPink: '#DB2777',
  onTintRed: '#DC2626',
};

const darkPalette: TeacherPalette = {
  primary: '#12B3C7',
  primaryDark: '#0F6D7A',
  secondary: '#0F6D7A',
  accent: '#5ABEDB',

  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#38BDF8',

  background: '#0B1220',
  surface: '#111A2B',
  surfaceAlt: '#16213A',
  border: '#243049',

  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textInverse: '#FFFFFF',

  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',

  tintTeal: '#13313A',
  tintBlue: '#10283B',
  tintGreen: '#11321F',
  tintOrange: '#33260F',
  tintPurple: '#291436',
  tintPink: '#33162A',
  tintRed: '#3A1A1A',

  onTintTeal: '#5ABEDB',
  onTintBlue: '#38BDF8',
  onTintGreen: '#34D399',
  onTintOrange: '#FBBF24',
  onTintPurple: '#C084FC',
  onTintPink: '#F472B6',
  onTintRed: '#F87171',
};

export const teacherPalettes = {
  light: lightPalette,
  dark: darkPalette,
};

/** Spacing scale (DESIGN.md base unit 8 — 4 added for fine control). */
export const teacherSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
} as const;

/** Border radii (DESIGN.md). */
export const teacherRadius = {
  sm: 8,
  button: 12,
  input: 12,
  card: 16,
  sheet: 24,
  full: 9999,
} as const;

/** Typography scale (DESIGN.md). */
export const teacherTypography = {
  display: { fontSize: 32, fontWeight: '700' as const },
  pageTitle: { fontSize: 28, fontWeight: '700' as const },
  sectionTitle: { fontSize: 20, fontWeight: '600' as const },
  cardTitle: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const },
  small: { fontSize: 14, fontWeight: '400' as const },
  smallStrong: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  captionStrong: { fontSize: 12, fontWeight: '600' as const },
} as const;

/** Elevation presets (DESIGN.md "avoid heavy shadows"). */
export const teacherShadow = {
  light: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
} as const;

/** Hero gradient stops (DESIGN.md: #0B5563 → #0F6D7A). */
export const teacherGradients = {
  hero: ['#0B5563', '#0F6D7A'] as const,
  heroDark: ['#0F6D7A', '#12B3C7'] as const,
  accent: ['#0F6D7A', '#12B3C7'] as const,
};
