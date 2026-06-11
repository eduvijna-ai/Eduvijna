/**
 * Navigate to a main app section from anywhere in the mobile navigation tree
 * (side drawer, ERP Schools nested stack, root stack modals).
 */

import { CommonActions } from '@react-navigation/native';
import { navigationRef } from '@core/services/navigationService';
import { APP_STACK_ROUTES, type AppMainTab } from './appRoutes';

/** Dispatch via the root NavigationContainer ref → Main → target tab. */
export function navigateToAppMainTab(tab: AppMainTab): void {
  if (!navigationRef.isReady()) return;

  navigationRef.dispatch(
    CommonActions.navigate({
      name: APP_STACK_ROUTES.MAIN,
      params: { screen: tab },
    }),
  );
}

export { APP_MAIN_TABS, type AppMainTab } from './appRoutes';
