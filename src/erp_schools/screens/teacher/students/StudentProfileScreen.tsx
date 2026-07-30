/**
 * Teacher Student Profile — wraps shared StudentProfileView with useTeacherData.
 */

import React from 'react';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import StudentProfileView from '../../shared/StudentProfileView';
import { useTeacherData } from '../../../hooks/useTeacherData';
import type { TeacherStackParamList } from '../../../types/navigation';

export default function StudentProfileScreen() {
  const route = useRoute<RouteProp<TeacherStackParamList, 'StudentProfile'>>();
  const { getStudentById, refetch, status } = useTeacherData();
  const studentId = route.params?.studentId;

  return (
    <StudentProfileView
      student={getStudentById(studentId)}
      rosterStatus={status}
      refetch={refetch}
      openEdit={!!route.params?.openEdit}
    />
  );
}
