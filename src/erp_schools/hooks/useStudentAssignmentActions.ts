/**
 * Student assignment mutations (LMS) — screens call this hook, not @core/api.
 */

import { useCallback, useState } from 'react';
import { submissionsApi } from '@core/api/erp.api';
import { extractErrorMessage } from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

export function useStudentAssignmentActions() {
  const { schoolId, userId } = useSchoolsSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitAssignment = useCallback(
    async (assignmentId: string | number, payload?: Record<string, unknown>) => {
      setSubmitting(true);
      setError(null);
      try {
        await submissionsApi.create({
          assignment_id: Number(assignmentId),
          student_id: userId ?? undefined,
          school_id: schoolId ?? undefined,
          status: 'submitted',
          ...payload,
        });
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to submit assignment'));
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [schoolId, userId],
  );

  return { submitAssignment, submitting, error };
}
