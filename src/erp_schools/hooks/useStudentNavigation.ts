/** Typed navigation helper for the Student stack. */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StudentStackParamList } from '../types/navigation';

export type StudentNav = NativeStackNavigationProp<StudentStackParamList>;

export function useStudentNavigation(): StudentNav {
  return useNavigation<StudentNav>();
}
