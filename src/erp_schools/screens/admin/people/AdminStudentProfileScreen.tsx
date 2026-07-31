/**
 * Admin Student Profile — Class Overview student detail (web StudentsTab panel).
 * Same Profile / Guardians / Medical / Documents flow as teacher.
 */

import React, { useCallback } from 'react';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { Alert } from 'react-native';
import { studentProfilesApi } from '@core/api/erp.api';
import StudentProfileView from '../../shared/StudentProfileView';
import { useAdminClassOverviewData } from '../../../hooks/useAdminClassOverviewData';
import { useSchoolsSession } from '../../../hooks/useSchoolsSession';
import type { AdminStackParamList } from '../../../types/navigation';
import { extractErrorMessage } from '../../../utils/apiHelpers';

export default function AdminStudentProfileScreen() {
  const route = useRoute<RouteProp<AdminStackParamList, 'AdminStudentProfile'>>();
  const { getStudentById, refetch, status } = useAdminClassOverviewData();
  const { schoolId } = useSchoolsSession();
  const studentId = route.params?.studentId;

  const onDeactivate = useCallback(
    async (profileId: number) => {
      try {
        await studentProfilesApi.softDelete(profileId, schoolId ?? undefined);
        return true;
      } catch (e) {
        Alert.alert('Failed', extractErrorMessage(e));
        return false;
      }
    },
    [schoolId],
  );

  return (
    <StudentProfileView
      student={getStudentById(studentId)}
      rosterStatus={status}
      refetch={refetch}
      openEdit={!!route.params?.openEdit}
      canDeactivate
      onDeactivate={onDeactivate}
    />
  );
}
