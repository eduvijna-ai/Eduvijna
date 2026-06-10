/**
 * Global typography — Poppins (matches EduVijna teacher dashboard reference).
 *
 * Geometric sans-serif with rounded forms; loaded via useAppFonts and applied
 * globally through the react-native vendor shim (src/vendor/react-native.ts).
 */

export const FONT_FAMILY = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export type FontWeightKey = keyof typeof FONT_FAMILY;

/** No-op — font wrapping is handled by the react-native shim after fonts load. */
export function setupGlobalFonts(): void {
  // Fonts are applied via src/vendor/react-native.ts Text/TextInput wrappers.
}
