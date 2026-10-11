import { useCallback, useRef, useState } from 'react';
import {
  submitAssignedQuiz,
  AssignedQuizSubmissionInProgressError,
  type SubmitAssignedQuizInput,
  type SubmitAssignedQuizResult,
} from '../services/assignedQuizSubmission.service';

export function useAssignedQuizSubmission() {
  const [submitting, setSubmitting] = useState(false);
  const syncGuardRef = useRef(false);

  const submit = useCallback(
    async (input: SubmitAssignedQuizInput): Promise<SubmitAssignedQuizResult> => {
      if (syncGuardRef.current) {
        throw new AssignedQuizSubmissionInProgressError();
      }
      syncGuardRef.current = true;
      setSubmitting(true);
      try {
        return await submitAssignedQuiz(input);
      } finally {
        syncGuardRef.current = false;
        setSubmitting(false);
      }
    },
    [],
  );

  return { submit, submitting };
}
