/**
 * Navigation Service
 * Provides global navigation functionality for use outside React components
 * Primarily used for authentication error handling in API interceptors
 */

import { CommonActions, createNavigationContainerRef, StackActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Navigate to a screen
 */
export function navigate(name: string, params?: any) {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.dispatch(
    CommonActions.navigate({
      name,
      params,
    }),
  );
}

/**
 * Reset navigation stack to a specific screen
 * Useful for logout/authentication flows
 */
export function resetToLogin() {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      StackActions.replace('Login')
    );
  }
}

/**
 * Go back to previous screen
 */
export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}
