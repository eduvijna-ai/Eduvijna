/**
 * Worksheet generate body aligned with Quiz-React worksheetService (deployed reference).
 * Optional string fields are sent as "" never null/undefined.
 */

export type WorksheetGenerateInput = {
  class: string;
  subject: string;
  lesson: string;
  level: string;
  itext?: string;
  count?: number;
  mcq_count: number;
  fitb_count: number;
  tf_count: number;
  short_q_count: number;
  matching_count: number;
  long_q_count?: number;
  type?: string;
};

function str(value: string | undefined | null): string {
  return typeof value === 'string' ? value : '';
}

export function buildWorksheetGeneratePayload(data: WorksheetGenerateInput) {
  const trimmedClass = str(data.class).trim();
  const trimmedSubject = str(data.subject).trim();
  const trimmedLesson = str(data.lesson).trim();
  const itext = str(data.itext);
  const hasSourceText = Boolean(itext.trim());

  const mcq_count = data.mcq_count ?? 0;
  const fitb_count = data.fitb_count ?? 0;
  const tf_count = data.tf_count ?? 0;
  const short_q_count = data.short_q_count ?? 0;
  const matching_count = data.matching_count ?? 0;
  const long_q_count = data.long_q_count ?? 0;
  const totalCount =
    data.count ??
    mcq_count + fitb_count + tf_count + short_q_count + matching_count + long_q_count;

  return {
    class: trimmedClass || (hasSourceText ? 'General' : ''),
    subject: trimmedSubject || (hasSourceText ? 'Document' : ''),
    lesson: trimmedLesson || (hasSourceText ? 'Selected content' : ''),
    level: str(data.level),
    itext,
    count: totalCount,
    mcq_count,
    fitb_count,
    tf_count,
    short_q_count,
    long_q_count,
    matching_count,
    type: str(data.type) || 'worksheet',
  };
}
