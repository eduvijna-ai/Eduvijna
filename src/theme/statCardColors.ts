/**
 * Stat Card Color Constants
 * 
 * Standard background colors for stat cards used across the application.
 * These ensure consistent theming and visual hierarchy.
 */

export const STAT_CARD_COLORS = {
  // Light mode backgrounds
  PINK: '#FFE5F1',
  BLUE: '#E3F2FD',
  ORANGE: '#FFF3E0',
  GREEN: '#E8F5E9',
  PURPLE: '#F3E5F5',
  
  // Icon colors (matching theme colors)
  ICON_ERROR: '#DC2626',    // Red - for students, critical items
  ICON_INFO: '#0891B2',     // Blue - for classes, informational
  ICON_WARNING: '#D97706',  // Orange - for assessments, warnings
  ICON_SUCCESS: '#059669',  // Green - for upcoming, positive items
  ICON_PURPLE: '#9C27B0',   // Purple - for special features
};

/**
 * Get stat card background color based on dark mode
 */
export const getStatCardBackground = (color: keyof typeof STAT_CARD_COLORS, isDark: boolean, cardColor: string) => {
  if (isDark) return cardColor;
  return STAT_CARD_COLORS[color];
};
