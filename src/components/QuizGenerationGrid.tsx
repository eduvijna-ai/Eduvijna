/**
 * QuizGenerationGrid Component
 *
 * Shows assessment-generation tiles that the current user is permitted to see.
 * - Items fetched from /api/v1/quiz-navigation-items (role-based, from the ERP backend).
 * - Falls back to all defaults if the API returns nothing (safe offline/new-account behaviour).
 * - Tile style mirrors the School ERP module grid for visual consistency.
 *
 * Used in: TeacherDashboard, CreateAssessmentModal
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useQuizNavItems,
  SCREEN_DEFAULTS,
  type ResolvedNavItem,
} from '@core/hooks/useQuizNavItems';

/** Hard-coded fallback order – shown when the API returns no items */
const FALLBACK_SCREENS = [
  'CreateAIQuizScreen',
  'CreateDocumentQuizScreen',
  'CreateImageQuizScreen',
  'CreateYouTubeQuizScreen',
  'CreateHandwrittenQuizScreen',
];

interface QuizGenerationGridProps {
  navigation?: any;
  onNavigate?: (screen: string, params?: any) => void;
  isDark?: boolean;
  theme: any;
  showTitle?: boolean;
  onQuizTypePress?: (screen: string) => void;
}

export default function QuizGenerationGrid({
  navigation,
  onNavigate,
  isDark = false,
  theme,
  showTitle = true,
  onQuizTypePress,
}: QuizGenerationGridProps) {
  const { items: navItems, loading } = useQuizNavItems();

  /** Tiles to render — API items when available, defaults otherwise */
  const tiles: ResolvedNavItem[] = useMemo(() => {
    if (navItems.length > 0) return navItems;
    // Fallback: show all defaults
    return FALLBACK_SCREENS.map((screen, i) => {
      const d = SCREEN_DEFAULTS[screen]!;
      return {
        screen,
        label: d.label,
        subtitle: d.subtitle,
        iconName: d.icon,
        iconColor: d.color,
        bgColor: d.bg,
        display_order: i,
      };
    });
  }, [navItems]);

  const handlePress = (screen: string) => {
    const useWorkspaceRedirect = Platform.OS !== 'web';
    const resolvedScreen =
      useWorkspaceRedirect && (screen === 'CreateDocumentQuizScreen' || screen === 'CreateHandwrittenQuizScreen')
        ? 'AssessmentWorkspaceScreen'
        : screen;

    const resolvedParams =
      useWorkspaceRedirect && screen === 'CreateDocumentQuizScreen'
        ? { mode: 'document' }
        : useWorkspaceRedirect && screen === 'CreateHandwrittenQuizScreen'
          ? { mode: 'handwritten' }
          : undefined;

    if (navigation?.navigate) {
      navigation.navigate(resolvedScreen, resolvedParams);
    } else if (onNavigate) {
      onNavigate(resolvedScreen, resolvedParams);
    } else if (onQuizTypePress) {
      onQuizTypePress(resolvedScreen);
    }
  };

  const AI_CONTENT_TILES = [
    {
      screen: 'RecentAssessmentsScreen',
      label: 'Recent AI Assessments',
      subtitle: 'View & retake saved quizzes',
      iconName: 'time',
      iconColor: '#0891B2',
    },
    {
      screen: 'WorksheetScreen',
      label: 'Create Worksheet',
      subtitle: 'AI-generated printable sheets',
      iconName: 'document-text',
      iconColor: '#059669',
    },
  ];

  return (
    <View style={styles.section}>
      {showTitle && (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            🧩 Generate Assessment
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Choose your preferred method
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <View style={styles.grid}>
          {tiles.map((tile) => (
            <TouchableOpacity
              key={tile.screen}
              style={[
                styles.tile,
                {
                  backgroundColor: isDark ? theme.colors.card : '#ffffff',
                  shadowColor: isDark ? '#000' : '#000',
                },
              ]}
              onPress={() => handlePress(tile.screen)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: tile.iconColor + '1A' },
                ]}
              >
                <Ionicons
                  name={tile.iconName as any}
                  size={26}
                  color={tile.iconColor}
                />
              </View>
              <Text
                style={[styles.tileLabel, { color: theme.colors.text }]}
                numberOfLines={2}
              >
                {tile.label}
              </Text>
              {tile.subtitle ? (
                <Text
                  style={[styles.tileSub, { color: theme.colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {tile.subtitle}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* My AI Content — always visible, separated from generation tiles */}
      <View style={[styles.aiContentDivider, { borderTopColor: theme.colors.border }]}>
        <Text style={[styles.aiContentHeading, { color: theme.colors.textSecondary }]}>
          MY AI CONTENT
        </Text>
      </View>
      <View style={styles.aiContentRow}>
        {AI_CONTENT_TILES.map((tile) => (
          <TouchableOpacity
            key={tile.screen}
            style={[
              styles.aiContentTile,
              {
                backgroundColor: isDark ? theme.colors.card : '#ffffff',
                borderColor: tile.iconColor + '40',
              },
            ]}
            onPress={() => handlePress(tile.screen)}
            activeOpacity={0.75}
          >
            <View style={[styles.aiContentIconWrap, { backgroundColor: tile.iconColor + '18' }]}>
              <Ionicons name={tile.iconName as any} size={22} color={tile.iconColor} />
            </View>
            <View style={styles.aiContentText}>
              <Text style={[styles.aiContentLabel, { color: theme.colors.text }]} numberOfLines={1}>
                {tile.label}
              </Text>
              <Text style={[styles.aiContentSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {tile.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={tile.iconColor} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── extra styles injected below the grid ───────────────────────────────────
const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 11,
  },
  loadingRow: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 3-column wrapping grid — mirrors ERPMainScreen grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '30%',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },
  tileSub: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
  aiContentDivider: {
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 10,
  },
  aiContentHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  aiContentRow: {
    gap: 8,
  },
  aiContentTile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  aiContentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiContentText: {
    flex: 1,
  },
  aiContentLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  aiContentSub: {
    fontSize: 11,
    marginTop: 1,
  },
});

