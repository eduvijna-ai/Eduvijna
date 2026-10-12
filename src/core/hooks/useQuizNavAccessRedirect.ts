import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useQuizNavScreenAccess } from './useQuizNavScreenAccess';

/**
 * Blocks screens that are not granted via quiz-navigation-items (plus shell allowlist).
 */
export function useQuizNavAccessRedirect(
  screenName: string,
  navigation: { goBack?: () => void; navigate?: (s: string, p?: unknown) => void } | undefined,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const { canAccessScreen, loading } = useQuizNavScreenAccess();

  useEffect(() => {
    if (!enabled || loading || !navigation) return;
    if (canAccessScreen(screenName)) return;
    Alert.alert(
      'Not available',
      'This assessment module is not enabled for your account.',
      [
        {
          text: 'OK',
          onPress: () => {
            if (navigation.goBack) navigation.goBack();
            else navigation.navigate?.('Main', { screen: 'Dashboard' });
          },
        },
      ],
      { cancelable: false },
    );
  }, [enabled, loading, canAccessScreen, screenName, navigation]);
}
