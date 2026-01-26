/**
 * Hook to setup authentication error handling with navigation
 * Call this in your root App component to handle auth failures globally
 */

import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { setAuthErrorNavigationCallback } from '@core/services/dashboardApi';

export function useAuthErrorHandler() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    // Set the global navigation callback for auth errors
    setAuthErrorNavigationCallback(() => {
      console.log('🔄 Navigating to login due to authentication failure...');
      
      // Reset navigation stack and go to login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    });

    // Cleanup on unmount
    return () => {
      setAuthErrorNavigationCallback(() => {});
    };
  }, [navigation]);
}
