/**
 * Canonical quiz-navigation capabilities derived from GET /quiz-navigation-items.
 * Screen names are routing targets; capabilities are authorization identities.
 */

import type { WorkspaceMode } from '@core/store/assessmentWorkspace.store';
import type { QuizNavItem } from '../api/erp.api';
import {
  QUIZ_COMPONENT_TO_SCREEN,
  QUIZ_NAV_TO_SCREEN,
  type ResolvedNavItem,
} from '../hooks/useQuizNavItems';

export type QuizNavCapability =
  | 'ai'
  | 'document'
  | 'handwritten'
  | 'image'
  | 'youtube'
  | 'website'
  | 'analytics'
  | 'erp';

const DOCUMENT_SCREENS = new Set([
  'CreateDocumentQuizScreen',
  'DocumentUploadHomeScreen',
]);

const HANDWRITTEN_SCREENS = new Set([
  'CreateHandwrittenQuizScreen',
  'HandwrittenWorkspace',
]);

const AI_SCREENS = new Set(['CreateAIQuizScreen']);
const IMAGE_SCREENS = new Set(['CreateImageQuizScreen', 'ImageAssessmentScreen']);
const YOUTUBE_SCREENS = new Set(['CreateYouTubeQuizScreen']);
const WEBSITE_SCREENS = new Set(['CreateWebsiteQuizScreen']);
const ANALYTICS_SCREENS = new Set(['Analytics']);
const ERP_SCREENS = new Set(['ERPSchools', 'ERP']);

function normalizeRoutePath(path?: string | null): string {
  const raw = String(path ?? '').trim().toLowerCase();
  if (!raw) return '';
  const withoutQuery = raw.split('?')[0].split('#')[0];
  const normalized = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  return normalized.replace(/\/+$/, '') || '/';
}

/** Capability implied by a mobile screen name (and optional workspace mode). */
export function resolveQuizNavCapabilityForScreen(
  screen: string,
  options?: { workspaceMode?: WorkspaceMode },
): QuizNavCapability | null {
  if (screen === 'AssessmentWorkspaceScreen') {
    const mode = options?.workspaceMode ?? 'document';
    return mode === 'handwritten' ? 'handwritten' : 'document';
  }
  if (DOCUMENT_SCREENS.has(screen)) return 'document';
  if (HANDWRITTEN_SCREENS.has(screen)) return 'handwritten';
  if (AI_SCREENS.has(screen)) return 'ai';
  if (IMAGE_SCREENS.has(screen)) return 'image';
  if (YOUTUBE_SCREENS.has(screen)) return 'youtube';
  if (WEBSITE_SCREENS.has(screen)) return 'website';
  if (ANALYTICS_SCREENS.has(screen)) return 'analytics';
  if (ERP_SCREENS.has(screen)) return 'erp';
  return null;
}

/** Capability granted by a single API navigation row (before mobile screen dedupe). */
export function resolveQuizNavCapabilityFromApiItem(item: QuizNavItem): QuizNavCapability | null {
  const routePath = normalizeRoutePath(item.route_path);
  const screenFromComponent =
    item.component_name ? QUIZ_COMPONENT_TO_SCREEN[item.component_name] : undefined;
  const screenFromRoute = QUIZ_NAV_TO_SCREEN[routePath];
  const screen =
    screenFromComponent ??
    screenFromRoute ??
    Object.entries(QUIZ_NAV_TO_SCREEN).find(([k]) => routePath.endsWith(k))?.[1];

  if (!screen) {
    if (routePath === '/document-quiz' || routePath.endsWith('/document-quiz')) return 'document';
    if (routePath === '/handwritten' || routePath.endsWith('/handwritten')) return 'handwritten';
    return null;
  }
  return resolveQuizNavCapabilityForScreen(screen);
}

export function resolveQuizNavCapabilitiesFromNavItems(
  items: ResolvedNavItem[],
): Set<QuizNavCapability> {
  const caps = new Set<QuizNavCapability>();
  for (const item of items) {
    const cap = resolveQuizNavCapabilityForScreen(item.screen);
    if (cap) caps.add(cap);
  }
  return caps;
}

export function hasQuizNavCapability(
  capability: QuizNavCapability,
  items: ResolvedNavItem[],
): boolean {
  return resolveQuizNavCapabilitiesFromNavItems(items).has(capability);
}

/** DocumentUploadHomeScreen and CreateDocumentQuizScreen share document capability. */
export function isSameQuizNavCapabilityFamily(
  a: QuizNavCapability,
  b: QuizNavCapability,
): boolean {
  return a === b;
}
