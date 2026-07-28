/** Open student timetable bottom tab from any student screen. */

import { useCallback } from 'react';
import { CommonActions } from '@react-navigation/native';
import { STUDENT_ROUTES, STUDENT_TABS } from '../navigation/studentRoutes';
import { useStudentNavigation } from './useStudentNavigation';

export function useOpenStudentTimetable() {
  const navigation = useStudentNavigation();

  return useCallback(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.dispatch(
        CommonActions.navigate({
          name: STUDENT_ROUTES.TABS,
          params: { screen: STUDENT_TABS.TIMETABLE },
        }),
      );
      return;
    }
    navigation.navigate(STUDENT_ROUTES.TABS, { screen: STUDENT_TABS.TIMETABLE });
  }, [navigation]);
}
