import { useCallback, useEffect } from 'react';

export function useDocumentScreenFocusEffect(effect: () => void | (() => void)) {
  const wrapped = useCallback(effect, [effect]);
  useEffect(() => wrapped(), [wrapped]);
}
