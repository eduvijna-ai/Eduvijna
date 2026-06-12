/** Typed navigation helper for the Admin stack. */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../types/navigation';

export type AdminNav = NativeStackNavigationProp<AdminStackParamList>;

export function useAdminNavigation(): AdminNav {
  return useNavigation<AdminNav>();
}
