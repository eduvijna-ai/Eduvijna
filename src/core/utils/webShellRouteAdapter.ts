/**
 * Maps React Navigation nested route names to web shell screen ids.
 */
const NESTED_WEB_SCREEN_MAP: Record<string, string> = {
  Assessments: 'assessments',
  Dashboard: 'dashboard',
  Profile: 'profile',
  Notifications: 'notifications',
  Analytics: 'analytics',
  Students: 'students',
  Classes: 'classes',
  Main: 'dashboard',
};

export function resolveWebShellScreen(route: string): string {
  if (!route) return 'dashboard';
  if (!route.includes('/')) {
    const direct = NESTED_WEB_SCREEN_MAP[route];
    return direct ?? route;
  }
  const segments = route.split('/').filter(Boolean);
  const leaf = segments[segments.length - 1] ?? route;
  return NESTED_WEB_SCREEN_MAP[leaf] ?? leaf.charAt(0).toLowerCase() + leaf.slice(1);
}
