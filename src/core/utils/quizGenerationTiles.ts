/**
 * Production helper used by QuizGenerationGrid to build Home generation tiles.
 * Capability-stable dedupe (document family) — not label/text matching.
 */

import {
  resolveQuizNavCapabilityForScreen,
  type QuizNavCapability,
} from '../domain/quizNavCapability';
import { SCREEN_DEFAULTS, type ResolvedNavItem } from '../hooks/useQuizNavItems';

export const QUIZ_GENERATION_FALLBACK_SCREENS = [
  'CreateAIQuizScreen',
  'CreateDocumentQuizScreen',
  'CreateImageQuizScreen',
  'CreateYouTubeQuizScreen',
] as const;

/** Screens the AI Assessment Platform expands into on mobile. */
export const QUIZ_GENERATION_PLATFORM_EXPANSION_SCREENS = [
  'CreateAIQuizScreen',
  'DocumentUploadHomeScreen',
  'CreateHandwrittenQuizScreen',
  'CreateImageQuizScreen',
] as const;

export function isQuizGenerationPlatformTile(tile: ResolvedNavItem): boolean {
  const label = tile.label.trim().toLowerCase();
  return (
    label === 'ai assessment platform' ||
    label.includes('assessment platform') ||
    tile.screen === 'CreateHandwrittenQuizScreen'
  );
}

function presentCapabilities(tiles: ResolvedNavItem[]): Set<QuizNavCapability> {
  const caps = new Set<QuizNavCapability>();
  for (const tile of tiles) {
    const cap = resolveQuizNavCapabilityForScreen(tile.screen);
    if (cap) caps.add(cap);
  }
  return caps;
}

function documentLabel(screen: string, label: string): string {
  if (screen === 'DocumentUploadHomeScreen' || screen === 'CreateDocumentQuizScreen') {
    return label === 'Document Quiz' ? 'Document' : label || 'Document';
  }
  return label;
}

export type ResolveQuizGenerationTilesInput = {
  fetchStatus: 'idle' | 'loading' | 'ready' | 'error' | string;
  navItems: ResolvedNavItem[];
};

/**
 * Same algorithm QuizGenerationGrid uses to decide which tiles appear on Home.
 */
export function resolveQuizGenerationTiles(
  input: ResolveQuizGenerationTilesInput,
): ResolvedNavItem[] {
  const { fetchStatus, navItems } = input;
  const source: ResolvedNavItem[] =
    fetchStatus === 'ready'
      ? navItems
      : fetchStatus === 'error'
        ? QUIZ_GENERATION_FALLBACK_SCREENS.map((screen, i) => {
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
          })
        : [];

  const hasPlatform = source.some(isQuizGenerationPlatformTile);
  const visible = source.filter((tile) => !isQuizGenerationPlatformTile(tile));

  if (!hasPlatform) {
    return visible.map((tile) => ({
      ...tile,
      label: documentLabel(tile.screen, tile.label),
    }));
  }

  const presentScreens = new Set(visible.map((t) => t.screen));
  const presentCaps = presentCapabilities(visible);
  const baseOrder = Math.max(0, ...visible.map((t) => t.display_order ?? 0)) + 1;
  const expanded = QUIZ_GENERATION_PLATFORM_EXPANSION_SCREENS.filter((screen) => {
    if (presentScreens.has(screen)) return false;
    const cap = resolveQuizNavCapabilityForScreen(screen);
    if (cap && presentCaps.has(cap)) return false;
    return true;
  }).map((screen, i) => {
    const d = SCREEN_DEFAULTS[screen]!;
    return {
      screen,
      label:
        screen === 'DocumentUploadHomeScreen' || screen === 'CreateDocumentQuizScreen'
          ? 'Document'
          : d.label,
      subtitle: d.subtitle,
      iconName: d.icon,
      iconColor: d.color,
      bgColor: d.bg,
      display_order: baseOrder + i,
    };
  });

  const seenCaps = new Set<QuizNavCapability>();
  const deduped: ResolvedNavItem[] = [];
  for (const tile of [...visible, ...expanded].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  )) {
    const cap = resolveQuizNavCapabilityForScreen(tile.screen);
    if (cap) {
      if (seenCaps.has(cap)) continue;
      seenCaps.add(cap);
    }
    deduped.push({
      ...tile,
      label: documentLabel(tile.screen, tile.label),
    });
  }
  return deduped;
}

/** Resolve navigation target for a generation tile press (mobile workspace redirect). */
export function resolveQuizGenerationNavigation(
  screen: string,
  options?: { isWeb?: boolean },
): { screen: string; params?: { mode: 'document' | 'handwritten' } } {
  const isWeb = options?.isWeb === true;
  const isDocument =
    screen === 'CreateDocumentQuizScreen' || screen === 'DocumentUploadHomeScreen';
  if (isWeb) {
    return { screen };
  }
  if (isDocument) {
    return { screen: 'AssessmentWorkspaceScreen', params: { mode: 'document' } };
  }
  if (screen === 'CreateHandwrittenQuizScreen') {
    return { screen: 'AssessmentWorkspaceScreen', params: { mode: 'handwritten' } };
  }
  if (screen === 'CreateImageQuizScreen') {
    return { screen: 'ImageAssessmentScreen' };
  }
  return { screen };
}
