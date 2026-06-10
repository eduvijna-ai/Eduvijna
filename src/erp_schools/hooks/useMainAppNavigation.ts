/**
 * Escape hatch from ERP Schools back to the host app's main Dashboard.
 */

import { useCallback } from 'react';
import { APP_MAIN_TABS } from '@mobile/navigation/appRoutes';
import { navigateToAppMainTab } from '@mobile/navigation/navigateToAppMainTab';

export function useMainAppNavigation() {
  const goToMainDashboard = useCallback(() => {
    navigateToAppMainTab(APP_MAIN_TABS.DASHBOARD);
  }, []);

  return { goToMainDashboard };
}
