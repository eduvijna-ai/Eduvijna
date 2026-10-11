/**
 * Select a check-record row for follow-up attempt / attended-quiz probes.
 */

export type CheckRecordRow = {
  status?: string | null;
  classid?: string;
  quiz_details?: {
    quiz_id?: number;
    session_id?: string;
  };
};

export function selectCheckRecordProbeTarget(
  pendingRows: CheckRecordRow[] | undefined,
  completedRows: CheckRecordRow[] | undefined,
): { quiz_id: number; session_id: string; source: 'completed' | 'pending' } | null {
  const completed = completedRows ?? [];
  const pending = pendingRows ?? [];
  const pick = (rows: CheckRecordRow[]) =>
    rows.find((row) => row.quiz_details?.quiz_id && row.quiz_details?.session_id);

  const fromCompleted = pick(completed);
  if (fromCompleted?.quiz_details?.quiz_id && fromCompleted.quiz_details.session_id) {
    return {
      quiz_id: fromCompleted.quiz_details.quiz_id,
      session_id: fromCompleted.quiz_details.session_id,
      source: 'completed',
    };
  }

  const fromPending = pick(pending);
  if (fromPending?.quiz_details?.quiz_id && fromPending.quiz_details.session_id) {
    return {
      quiz_id: fromPending.quiz_details.quiz_id,
      session_id: fromPending.quiz_details.session_id,
      source: 'pending',
    };
  }

  return null;
}
