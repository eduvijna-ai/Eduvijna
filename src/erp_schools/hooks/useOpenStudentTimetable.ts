/** Open student timetable from tab or stack screens (bubbles to StudentStack). */

import { useCallback } from 'react';
import { CommonActions } from '@react-navigation/native';
import { STUDENT_ROUTES } from '../navigation/studentRoutes';
import { useStudentNavigation } from './useStudentNavigation';

export function useOpenStudentTimetable() {
  const navigation = useStudentNavigation();

  return useCallback(() => {
    // Prefer parent stack (StudentHome lives inside tabs). Fall back to direct navigate.
    const parent = navigation.getParent();
    if (parent) {
      parent.dispatch(
        CommonActions.navigate({
          name: STUDENT_ROUTES.TIMETABLE,
        }),
      );
      return;
    }
    navigation.navigate(STUDENT_ROUTES.TIMETABLE);
  }, [navigation]);
}
