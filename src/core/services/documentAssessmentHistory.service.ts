/**
 * Document assessment history — aligned with Quiz-React HandwrittenWorkspace list sources.
 */

import { listUserAssessments, type AssessmentListItem } from './sharedApi';

function dedupeById(items: AssessmentListItem[]): AssessmentListItem[] {
  const seen = new Set<string | number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function listSafe(
  assessment_type?: string,
  source?: string,
): Promise<AssessmentListItem[]> {
  try {
    const rows = await listUserAssessments(assessment_type, source);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export type DocumentHistoryBuckets = {
  quizzes: AssessmentListItem[];
  worksheets: AssessmentListItem[];
  curricula: AssessmentListItem[];
  errors: string[];
};

/** Load saved document quizzes/worksheets/curriculum rows (web Doc-File-* + legacy mobile sources). */
export async function loadDocumentAssessmentHistory(): Promise<DocumentHistoryBuckets> {
  const errors: string[] = [];

  const quizLists = await Promise.all([
    listSafe('web-quiz', 'Doc-File-Assessment'),
    listSafe('web-quiz', 'Document'),
    listSafe('quiz', 'DocumentUpload'),
    listSafe('document-quiz', 'Doc-File-Curriculum'),
  ]);

  const worksheetLists = await Promise.all([
    listSafe('worksheet', 'Doc-File-Worksheet'),
    listSafe('worksheet', 'Doc-Worksheet'),
  ]);

  const quizzes = dedupeById(quizLists.flat());
  const worksheets = dedupeById(worksheetLists.flat());
  const curricula = dedupeById(await listSafe('document-quiz', 'Doc-File-Curriculum'));

  return { quizzes, worksheets, curricula, errors };
}
