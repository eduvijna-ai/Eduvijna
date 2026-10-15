/**
 * useQuizNavItems — Role-based assessment generation tabs.
 *
 * Fetches the list of quiz navigation items (assessment type tiles) that the
 * current user is allowed to see, based on their role.
 *
 * Items come from GET /api/v1/quiz-navigation-items — the same endpoint used
 * by the web app to control which assessment tabs are visible.
 *
 * The result is cached in module-level state so re-renders across multiple
 * components (Dashboard + other screens) do not trigger duplicate fetches.
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { quizNavItemsApi, type QuizNavItem } from '../api/erp.api';

// Module-level cache so items are fetched only once per session
let cachedItems: QuizNavItem[] | null = null;
let cachedRole: string | null = null;
let fetchPromise: Promise<QuizNavItem[]> | null = null;

/**
 * Map route_path or component_name to the React Native screen name used
 * in the navigation stack.
 */
export const QUIZ_NAV_TO_SCREEN: Record<string, string> = {
  // By route_path
  '/web-quiz':               'CreateAIQuizScreen',
  '/quiz':                   'CreateAIQuizScreen',
  '/document-quiz':          'DocumentUploadHomeScreen',
  '/ai-assessment':          'CreateAIQuizScreen',
  '/ai':                     'CreateAIQuizScreen',
  '/document':               'DocumentUploadHomeScreen',
  '/document-assessment':    'DocumentUploadHomeScreen',
  '/document-upload':        'DocumentUploadHomeScreen',
  '/handwritten':            'CreateHandwrittenQuizScreen',
  '/handwritten-assessment': 'CreateHandwrittenQuizScreen',
  '/document-handwritten':   'CreateHandwrittenQuizScreen',
  '/image':                  'CreateImageQuizScreen',
  '/image-assessment':       'CreateImageQuizScreen',
  '/image-quiz':             'CreateImageQuizScreen',
  '/youtube':                'CreateYouTubeQuizScreen',
  '/youtube-assessment':     'CreateYouTubeQuizScreen',
  '/youtube-quiz':           'CreateYouTubeQuizScreen',
  '/website':                'CreateWebsiteQuizScreen',
  '/website-assessment':     'CreateWebsiteQuizScreen',
  '/analytics':              'Analytics',
  '/erp':                    'ERPSchools',
};

export const QUIZ_COMPONENT_TO_SCREEN: Record<string, string> = {
  'CreateAIQuizScreen':          'CreateAIQuizScreen',
  'WebQuiz':                     'CreateAIQuizScreen',
  'Quiz':                        'CreateAIQuizScreen',
  'AITimer':                     'CreateAIQuizScreen',
  'CreateDocumentQuizScreen':    'DocumentUploadHomeScreen',
  'DocumentUploadHomeScreen':    'DocumentUploadHomeScreen',
  'DocumentQuiz':                'DocumentUploadHomeScreen',
  'DocumentQuizPage':            'DocumentUploadHomeScreen',
  'HandwrittenWorkspace':        'CreateHandwrittenQuizScreen',
  'Handwritten':                 'CreateHandwrittenQuizScreen',
  'DocImageExtraction':          'CreateHandwrittenQuizScreen',
  'CreateHandwrittenQuizScreen': 'CreateHandwrittenQuizScreen',
  'CreateImageQuizScreen':       'CreateImageQuizScreen',
  'ImageQuizPage':               'CreateImageQuizScreen',
  'ImageAssessmentWorkspace':    'CreateImageQuizScreen',
  'CreateYouTubeQuizScreen':     'CreateYouTubeQuizScreen',
  'YouTubeQuizPage':             'CreateYouTubeQuizScreen',
  'CreateWebsiteQuizScreen':     'CreateWebsiteQuizScreen',
  'TeacherAnalytics':            'Analytics',
  'ERP':                         'ERPSchools',
  'ERPSchools':                  'ERPSchools',
};

/** Default tile appearance per RN screen name */
export const SCREEN_DEFAULTS: Record<string, { color: string; bg: string; icon: string; label: string; subtitle: string }> = {
  CreateAIQuizScreen:          { color: '#0891B2', bg: '#E3F2FD', icon: 'bulb',         label: 'AI Assessment',  subtitle: 'Topic-based' },
  CreateDocumentQuizScreen:    { color: '#0F766E', bg: '#ECFEFF', icon: 'document',     label: 'Document Quiz',  subtitle: 'Upload & books' },
  DocumentUploadHomeScreen:    { color: '#0F766E', bg: '#ECFEFF', icon: 'folder-open',  label: 'Document Quiz',  subtitle: 'Upload & books' },
  CreateHandwrittenQuizScreen: { color: '#7C3AED', bg: '#F3E5F5', icon: 'create',       label: 'Handwritten',    subtitle: 'Notes/Paper' },
  CreateImageQuizScreen:       { color: '#D97706', bg: '#FFF3E0', icon: 'image',        label: 'Image',          subtitle: 'Photo/PDF' },
  CreateYouTubeQuizScreen:     { color: '#059669', bg: '#E8F5E9', icon: 'logo-youtube', label: 'YouTube',        subtitle: 'Video-based' },
  CreateWebsiteQuizScreen:     { color: '#9C27B0', bg: '#F3E5F5', icon: 'globe',        label: 'Website',        subtitle: 'URL-based' },
  Analytics:                   { color: '#0EA5E9', bg: '#E0F2FE', icon: 'stats-chart',  label: 'Teacher Analytics',  subtitle: 'Performance insights' },
  ERP:                         { color: '#14B8A6', bg: '#E6FFFA', icon: 'business',     label: 'School ERP',         subtitle: 'ERP modules' },
  ERPSchools:                  { color: '#0B5563', bg: '#E6F3F5', icon: 'school',       label: 'School ERP',         subtitle: 'Classes & students' },
};

const EMOJI_ICON_TO_IONICON: Record<string, string> = {
  '📊': 'stats-chart',
  '🧾': 'document-text',
  '🏫': 'business',
  '📝': 'create',
  '📄': 'document',
  '✏️': 'create',
  '✏': 'create',
};

function normalizeRoutePath(path?: string | null): string {
  const raw = String(path ?? '').trim().toLowerCase();
  if (!raw) return '';
  const withoutQuery = raw.split('?')[0].split('#')[0];
  const normalized = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  return normalized.replace(/\/+$/, '') || '/';
}

function resolveIconName(icon: string | undefined, defaultIcon: string): string {
  const raw = String(icon ?? '').trim();
  if (!raw) return defaultIcon;

  if (EMOJI_ICON_TO_IONICON[raw]) {
    return EMOJI_ICON_TO_IONICON[raw];
  }

  // Ionicons names are kebab-case-ish identifiers (e.g., "logo-youtube").
  // If backend sends emoji/text, fall back to a safe icon to avoid '?' glyph.
  if (/^[a-z0-9-]+$/i.test(raw)) {
    return raw;
  }

  return defaultIcon;
}

export interface ResolvedNavItem {
  /** React Native screen name to navigate to */
  screen: string;
  label: string;
  subtitle: string;
  iconName: string;
  iconColor: string;
  bgColor: string;
  display_order: number;
}

/** Resolve a raw QuizNavItem to the mobile-specific screen + appearance */
function resolveNavItem(item: QuizNavItem): ResolvedNavItem | null {
  const routePath = normalizeRoutePath(item.route_path);
  // Try component_name first, then route_path
  const screen =
    (item.component_name ? QUIZ_COMPONENT_TO_SCREEN[item.component_name] : undefined) ??
    QUIZ_NAV_TO_SCREEN[routePath] ??
    // Fuzzy match on route_path suffix
    Object.entries(QUIZ_NAV_TO_SCREEN).find(([k]) =>
      routePath.endsWith(k),
    )?.[1];

  if (!screen) return null;

  const defaults = SCREEN_DEFAULTS[screen] ?? {
    color: '#64748b', bg: '#F1F5F9', icon: 'apps', label: item.label, subtitle: '',
  };

  return {
    screen,
    label: item.label || defaults.label,
    subtitle: item.description || defaults.subtitle,
    iconName: resolveIconName(item.icon, defaults.icon),
    iconColor: defaults.color,
    bgColor: defaults.bg,
    display_order: item.display_order ?? 999,
  };
}

export type QuizNavItemsFetchStatus = 'loading' | 'ready' | 'error';

export interface UseQuizNavItemsReturn {
  items: ResolvedNavItem[];
  loading: boolean;
  /** `ready` = successful API response (may be empty); `error` = request failed (offline fallback allowed). */
  fetchStatus: QuizNavItemsFetchStatus;
  error: string | null;
  refetch: () => void;
}

function dedupeByScreen(items: ResolvedNavItem[]): ResolvedNavItem[] {
  const byScreen = new Map<string, ResolvedNavItem>();
  for (const item of items) {
    const existing = byScreen.get(item.screen);
    if (!existing || item.display_order < existing.display_order) {
      byScreen.set(item.screen, item);
    }
  }
  return Array.from(byScreen.values()).sort((a, b) => a.display_order - b.display_order);
}

export function useQuizNavItems(): UseQuizNavItemsReturn {
  const { user } = useAuth();
  const role = user?.role ?? 'instructor';

  const [items, setItems] = useState<ResolvedNavItem[]>(() => {
    // Warm-start from cache if role matches
    if (cachedItems && cachedRole === role) {
      const resolved = cachedItems
        .map(resolveNavItem)
        .filter((x): x is ResolvedNavItem => x !== null)
        .sort((a, b) => a.display_order - b.display_order);
      return dedupeByScreen(resolved);
    }
    return [];
  });
  const [loading, setLoading] = useState(items.length === 0);
  const [fetchStatus, setFetchStatus] = useState<QuizNavItemsFetchStatus>(
    items.length > 0 ? 'ready' : 'loading',
  );
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const fetch = async () => {
    if (!mounted.current) return;
    setLoading(true);
    setFetchStatus('loading');
    setError(null);
    try {
      // Reuse an in-flight fetch if one is already running for the same role
      if (!fetchPromise || cachedRole !== role) {
        cachedRole = role;
        fetchPromise = quizNavItemsApi.getForRole(role);
      }
      const raw = await fetchPromise;
      fetchPromise = null;
      cachedItems = raw;

      if (!mounted.current) return;

      const resolved = raw
        .map(resolveNavItem)
        .filter((x): x is ResolvedNavItem => x !== null)
        .sort((a, b) => a.display_order - b.display_order);

      setItems(dedupeByScreen(resolved));
      setFetchStatus('ready');
    } catch (e: any) {
      if (mounted.current) {
        setError(e?.message ?? 'Failed to load assessment tabs');
        setFetchStatus('error');
        setItems([]);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    // Only fetch if we don't have a valid cache for this role
    if (!cachedItems || cachedRole !== role) {
      fetch();
    } else {
      setLoading(false);
      setFetchStatus('ready');
    }
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return { items, loading, fetchStatus, error, refetch: fetch };
}

/** Returns whether the signed-in role may open a generation screen from API nav items. */
export function isQuizNavScreenAllowed(screen: string, items: ResolvedNavItem[]): boolean {
  if (!screen) return false;
  return items.some((item) => item.screen === screen);
}

/** Clear the module-level cache (call on logout) */
export function clearQuizNavCache() {
  cachedItems = null;
  cachedRole = null;
  fetchPromise = null;
}
