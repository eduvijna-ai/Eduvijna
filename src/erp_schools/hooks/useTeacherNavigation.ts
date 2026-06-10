/** Typed navigation helper for the Teacher stack. */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TeacherStackParamList } from '../types/navigation';

export type TeacherNav = NativeStackNavigationProp<TeacherStackParamList>;

export function useTeacherNavigation(): TeacherNav {
  return useNavigation<TeacherNav>();
}
