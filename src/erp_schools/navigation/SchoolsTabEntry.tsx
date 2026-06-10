/**
 * Mounts TeacherNavigator only while the host app's Schools tab is focused.
 * Unmounting on blur resets navigation so each visit opens TeacherHomeScreen.
 */

import React from 'react';
import { useIsFocused } from '@react-navigation/native';
import { TeacherStack } from './TeacherStack';

export function SchoolsTabEntry() {
  const isFocused = useIsFocused();
  if (!isFocused) return null;
  return <TeacherStack />;
}
