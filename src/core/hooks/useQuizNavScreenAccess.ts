import { useMemo } from 'react';
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

export function useQuizNavScreenAccess() {
  const { items, loading } = useQuizNavItems();
  const allowedScreens = useMemo(() => {
    const set = new Set(ALWAYS_ALLOWED_SCREENS);
    for (const item of items) {
      set.add(item.screen);
    }
    return set;
  }, [items]);

  const canAccessScreen = (screen: string) => allowedScreens.has(screen);

  return { allowedScreens, canAccessScreen, loading, navItems: items };
}
