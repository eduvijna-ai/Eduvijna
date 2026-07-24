/**
 * Mounts the persona-appropriate ERP Schools navigator only while the host app's
 * Schools tab is focused. Unmounting on blur resets navigation so each visit
 * opens the persona's home screen.
 *
 * Wrapped in AcademicYearProvider so all persona stacks share school year context.
 */

import React from 'react';
import { useIsFocused } from '@react-navigation/native';
import { AcademicYearProvider } from '../contexts/AcademicYearContext';
import { useSchoolsSession } from '../hooks/useSchoolsSession';
import { TeacherStack } from './TeacherStack';
import { StudentStack } from './StudentStack';
import { AdminStack } from './AdminStack';

function PersonaNavigator() {
  const { persona } = useSchoolsSession();
  if (persona === 'admin' || persona === 'principal') return <AdminStack />;
  if (persona === 'student') return <StudentStack />;
  return <TeacherStack />;
}

export function SchoolsTabEntry() {
  const isFocused = useIsFocused();
  const { schoolId } = useSchoolsSession();

  if (!isFocused) return null;

  return (
    <AcademicYearProvider schoolId={schoolId}>
      <PersonaNavigator />
    </AcademicYearProvider>
  );
}
