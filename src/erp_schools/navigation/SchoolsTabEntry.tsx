/**
 * Mounts the persona-appropriate ERP Schools navigator only while the host app's
 * Schools tab is focused. Unmounting on blur resets navigation so each visit
 * opens the persona's home screen.
 *
 * Role-based routing (single source of truth = useTeacherSession().persona,
 * which reads the existing auth/user store):
 *   • admin (role 'admin'/'super_admin' or role_id 1/2) → AdminStack
 *   • student → StudentStack
 *   • teacher → TeacherStack
 *   • others  → TeacherStack (existing behaviour preserved)
 */

import React from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useTeacherSession } from '../hooks/useTeacherSession';
import { TeacherStack } from './TeacherStack';
import { StudentStack } from './StudentStack';
import { AdminStack } from './AdminStack';

export function SchoolsTabEntry() {
  const isFocused = useIsFocused();
  const { persona } = useTeacherSession();

  if (!isFocused) return null;
  if (persona === 'admin') return <AdminStack />;
  if (persona === 'student') return <StudentStack />;
  return <TeacherStack />;
}
