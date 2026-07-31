/**
 * Admin Exams — web ExamsTab parity (same as teacher staff hub).
 * Reuses TeacherExamsScreen + child exam routes on AdminStack.
 */

import React from 'react';
import TeacherExamsScreen from '../../teacher/exams/TeacherExamsScreen';

export default function ExamsScreen() {
  return <TeacherExamsScreen role="admin" />;
}
