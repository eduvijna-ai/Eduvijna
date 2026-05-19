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
    if (navigation?.navigate) {
      navigation.navigate(screen);
    } else if (onNavigate) {
      onNavigate(screen);
    } else if (onQuizTypePress) {
      onQuizTypePress(screen);
    }
  };

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
              {/* Icon circle — matches ERP tile icon wrap */}
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
    </View>
  );
}

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
});

