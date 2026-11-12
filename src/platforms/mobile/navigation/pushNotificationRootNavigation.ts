/**
 * Map logical push-notification destinations onto the real mobile root stack.
 *
 * Hierarchy (BottomTabNavigator.tsx):
 * - Root stack: Main, Assessments, QuizResultsScreen, …
 * - Main → BottomTabNavigator tabs include hidden `Notifications`
 *
 * Root `navigate('Notifications')` is not a registered stack route; use nested Main.
 * Keep Assessments / QuizResultsScreen as direct root-stack navigations.
 */

import { APP_STACK_ROUTES } from './appRoutes';

export type PushRootNavigateArgs = {
  name: string;
  params?: unknown;
};

/** Screens that exist only under Main (not as root stack siblings). */
const NESTED_MAIN_PUSH_SCREENS = new Set(['Notifications']);

export function resolvePushRootNavigation(
  screen: string,
  params?: unknown,
): PushRootNavigateArgs {
  if (NESTED_MAIN_PUSH_SCREENS.has(screen)) {
    return {
      name: APP_STACK_ROUTES.MAIN,
      params:
        params === undefined
          ? { screen }
          : { screen, params },
    };
  }

  return params === undefined ? { name: screen } : { name: screen, params };
}

/**
 * Invoke a root-capable navigate() with the correct nested shape for push taps.
 */
export function navigatePushRootDestination(
  navigate: (name: string, params?: unknown) => void,
  screen: string,
  params?: unknown,
): void {
  const target = resolvePushRootNavigation(screen, params);
  navigate(target.name, target.params);
}
