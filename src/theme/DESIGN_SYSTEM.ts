/**
 * STANDARDIZED UI PATTERNS - DESIGN SYSTEM
 * 
 * This file documents all standardized sizes, colors, and patterns
 * used across the Eduvijna application for consistency.
 */

// ==================== STAT CARDS ====================

/**
 * STAT CARD DIMENSIONS
 * Used in: TeacherDashboard, StudentDashboard, UnifiedDashboard
 */
export const STAT_CARD = {
  borderRadius: 16,
  padding: 16,
  elevation: 2,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  
  // Icon container
  iconSize: 32,
  iconContainerSize: null, // Auto-sized based on icon
  iconMarginBottom: 8,
  
  // Text sizing
  numberFontSize: 24,
  numberFontWeight: '700',
  numberMarginBottom: 4,
  
  labelFontSize: 11,
  labelTextAlign: 'center',
};

/**
 * STAT CARD COLORS (Light Mode)
 * These colors provide visual hierarchy and quick recognition
 */
export const STAT_CARD_BACKGROUNDS = {
  PINK: '#FFE5F1',      // Students, People-related
  BLUE: '#E3F2FD',      // Classes, Informational
  ORANGE: '#FFF3E0',    // Assessments, Warnings
  GREEN: '#E8F5E9',     // Upcoming, Positive states
  PURPLE: '#F3E5F5',    // Special features, Website
};

/**
 * STAT CARD ICON COLORS
 * Matching with the background colors for visual harmony
 */
export const STAT_CARD_ICON_COLORS = {
  ERROR: '#DC2626',     // Red - for students, critical items
  INFO: '#0891B2',      // Blue - for classes, informational
  WARNING: '#D97706',   // Orange - for assessments, warnings
  SUCCESS: '#059669',   // Green - for upcoming, positive items
  PURPLE: '#9C27B0',    // Purple - for special features
};

// ==================== QUIZ GENERATION GRID ====================

/**
 * QUIZ OPTION CARDS DIMENSIONS
 * Used in: QuizGenerationGrid component (TeacherDashboard, StudentDashboard, Assessments, Header Modal)
 */
export const QUIZ_OPTION_CARD = {
  // Section
  sectionPaddingHorizontal: 20,
  sectionPaddingTop: 24,
  sectionPaddingBottom: 32,
  
  // Grid
  gridGap: 10,
  gridMarginTop: 4,
  
  // Card
  cardWidth: '31%',    // 3 columns with gap
  cardAspectRatio: 1,  // Square cards
  cardBorderRadius: 12,
  cardPadding: 10,
  cardElevation: 2,
  cardShadowOffset: { width: 0, height: 2 },
  cardShadowOpacity: 0.1,
  cardShadowRadius: 4,
  
  // Icon
  iconWidth: 44,
  iconHeight: 44,
  iconBorderRadius: 22,
  iconSize: 28,
  iconMarginBottom: 6,
  
  // Text
  titleFontSize: 13,
  titleFontWeight: '700',
  titleMarginBottom: 2,
  
  subtitleFontSize: 10,
};

/**
 * QUIZ OPTION COLORS
 */
export const QUIZ_OPTION_BACKGROUNDS = {
  AI_PROMPT: '#E3F2FD',      // Light Blue
  DOCUMENT: '#FFE5F1',       // Light Pink
  IMAGE: '#FFF3E0',          // Light Orange
  YOUTUBE: '#E8F5E9',        // Light Green
  WEBSITE: '#F3E5F5',        // Light Purple
};

export const QUIZ_OPTION_ICON_COLORS = {
  AI_PROMPT: '#0891B2',      // Teal/Blue
  DOCUMENT: '#DC2626',       // Red
  IMAGE: '#D97706',          // Orange
  YOUTUBE: '#059669',        // Green
  WEBSITE: '#9C27B0',        // Purple
};

// ==================== USAGE EXAMPLES ====================

/**
 * STAT CARD - Teacher Dashboard
 * 
 * <View style={[styles.statCard, { backgroundColor: isDark ? colors.card : STAT_CARD_BACKGROUNDS.PINK }]}>
 *   <View style={styles.statIconContainer}>
 *     <Ionicons name="people" size={32} color={STAT_CARD_ICON_COLORS.ERROR} />
 *   </View>
 *   <Text style={styles.statNumber}>{stats.totalStudents}</Text>
 *   <Text style={styles.statLabel}>Total Students</Text>
 * </View>
 */

/**
 * QUIZ OPTION CARD
 * 
 * <TouchableOpacity
 *   style={[styles.quizOptionCard, { backgroundColor: isDark ? colors.card : QUIZ_OPTION_BACKGROUNDS.AI_PROMPT }]}
 * >
 *   <View style={[styles.quizOptionIcon, { backgroundColor: QUIZ_OPTION_ICON_COLORS.AI_PROMPT }]}>
 *     <Ionicons name="bulb" size={28} color="#FFF" />
 *   </View>
 *   <Text style={styles.quizOptionTitle}>AI Prompt</Text>
 *   <Text style={styles.quizOptionSubtitle}>Topic-based</Text>
 * </TouchableOpacity>
 */

// ==================== GLOBAL STYLE IMPORTS ====================

/**
 * HOW TO USE GLOBAL STYLES
 * 
 * 1. Import global styles and theme:
 *    import { useGlobalStyles } from '../hooks/useGlobalStyles';
 *    const { styles, colors } = useGlobalStyles();
 * 
 * 2. Use pre-defined styles:
 *    <View style={styles.statsContainer}>
 *      <View style={[styles.statCard, styles.statCardPink]}>
 *        ...
 *      </View>
 *    </View>
 * 
 * 3. For dark mode support:
 *    const { isDark } = useTheme();
 *    backgroundColor: isDark ? colors.card : STAT_CARD_BACKGROUNDS.PINK
 */
