/**
 * useTeacherAttendanceActions — mark class attendance via ERP bulk upsert.
 */

import { useCallback, useState } from 'react';
import { attendanceRecordsApi } from '@core/api/erp.api';
import { extractErrorMessage, toLocalDateStr } from '../utils/apiHelpers';
import type { AttendanceStatus } from '../types/domain';
import { useSchoolsSession } from './useSchoolsSession';
import { useAcademicYear } from '../contexts/AcademicYearContext';

export function useTeacherAttendanceActions() {
  const { schoolId, userId } = useSchoolsSession();
  const { selectedYearId } = useAcademicYear();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveClassAttendance = useCallback(
    async (args: {
      classId?: string | number;
      statuses: Record<string, AttendanceStatus>;
      date?: string;
    }) => {
      setSaving(true);
      setError(null);
      try {
        const date = args.date ?? toLocalDateStr();
        const records = Object.entries(args.statuses).map(([studentId, status]) => ({
          student_id: Number(studentId),
          date,
          status,
          school_id: schoolId ?? undefined,
          class_id: args.classId != null ? Number(args.classId) : undefined,
          academic_year_id: selectedYearId ?? undefined,
          marked_by: userId ?? undefined,
        }));
        await attendanceRecordsApi.bulkUpsert({ records, school_id: schoolId });
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to save attendance'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, userId, selectedYearId],
  );

  return { saveClassAttendance, saving, error };
}
