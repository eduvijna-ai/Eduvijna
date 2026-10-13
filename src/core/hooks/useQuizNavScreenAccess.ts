import { useMemo } from 'react';
import type { WorkspaceMode } from '@core/store/assessmentWorkspace.store';
import {
  hasQuizNavCapability,
  resolveQuizNavCapabilityForScreen,
  resolveQuizNavCapabilitiesFromNavItems,
  type QuizNavCapability,
} from '../domain/quizNavCapability';
import { useQuizNavItems } from './useQuizNavItems';

/** Screens that remain reachable when absent from quiz-navigation-items (core app shell). */
const ALWAYS_ALLOWED_SCREENS = new Set([
  'Home',
  'Assessments',
  'Analytics',
  'Profile',
  'Settings',
  'Login',
  'QuizResultsScreen',
  'StudentList',
  'QuizTakingScreen',
  'WorksheetScreen',
]);

export type QuizNavAccessOptions = {
  workspaceMode?: WorkspaceMode;
};

export function useQuizNavScreenAccess() {
  const { items, loading } = useQuizNavItems();
  const allowedScreens = useMemo(() => {
    const set = new Set(ALWAYS_ALLOWED_SCREENS);
    for (const item of items) {
      set.add(item.screen);
    }
    return set;
  }, [items]);

  const grantedCapabilities = useMemo(
    () => resolveQuizNavCapabilitiesFromNavItems(items),
    [items],
  );

  const canAccessScreen = (screen: string, options?: QuizNavAccessOptions) => {
    if (ALWAYS_ALLOWED_SCREENS.has(screen)) return true;
    const capability = resolveQuizNavCapabilityForScreen(screen, {
      workspaceMode: options?.workspaceMode,
    });
    if (capability) {
      return hasQuizNavCapability(capability, items);
    }
    return allowedScreens.has(screen);
  };

  const canAccessCapability = (capability: QuizNavCapability) =>
    hasQuizNavCapability(capability, items);

  return {
    allowedScreens,
    grantedCapabilities,
    canAccessScreen,
    canAccessCapability,
    loading,
    navItems: items,
  };
}
