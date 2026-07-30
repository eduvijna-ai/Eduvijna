/**
 * Admin Fee Management — web FeesTab parity (school-wide).
 * Reuses teacher fees hub with role="admin" (+ Structure / Receipts tabs).
 */

import React from 'react';
import TeacherFeesScreen from '../../teacher/fees/TeacherFeesScreen';

export default function FeeCollectionScreen() {
  return <TeacherFeesScreen role="admin" />;
}
