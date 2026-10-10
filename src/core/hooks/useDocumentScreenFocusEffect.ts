import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Web shell screens are not inside a React Navigation stack; mount/unmount replaces focus.
 */
export function useDocumentScreenFocusEffect(effect: () => void | (() => void)) {
  const wrapped = useCallback(effect, [effect]);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    return wrapped();
  }, [wrapped]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return undefined;
      return wrapped();
    }, [wrapped]),
  );
}
