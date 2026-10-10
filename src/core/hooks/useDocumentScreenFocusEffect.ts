import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export function useDocumentScreenFocusEffect(effect: () => void | (() => void)) {
  const wrapped = useCallback(effect, [effect]);
  useFocusEffect(
    useCallback(() => wrapped(), [wrapped]),
  );
}
