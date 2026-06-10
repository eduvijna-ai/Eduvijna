/** Maps a semantic accent key to a {bg tint, fg icon-color} pair from the palette. */

import type { TeacherPalette } from './tokens';

export type AccentKey = 'teal' | 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'red';

export interface AccentColors {
  bg: string;
  fg: string;
}

export function accentColors(palette: TeacherPalette, accent: AccentKey): AccentColors {
  switch (accent) {
    case 'blue':
      return { bg: palette.tintBlue, fg: palette.onTintBlue };
    case 'green':
      return { bg: palette.tintGreen, fg: palette.onTintGreen };
    case 'orange':
      return { bg: palette.tintOrange, fg: palette.onTintOrange };
    case 'purple':
      return { bg: palette.tintPurple, fg: palette.onTintPurple };
    case 'pink':
      return { bg: palette.tintPink, fg: palette.onTintPink };
    case 'red':
      return { bg: palette.tintRed, fg: palette.onTintRed };
    case 'teal':
    default:
      return { bg: palette.tintTeal, fg: palette.onTintTeal };
  }
}
