/**
 * Canonical Document assessment entry navigation.
 *
 * Founder-approved reference: the Document experience opened from the '+' menu,
 * which resolves to DocumentUploadHomeScreen (From Upload / From Books / History).
 * Dashboard tiles, sidebar, and other entry points must use this same target.
 */

export const DOCUMENT_ASSESSMENT_HOME_SCREEN = 'DocumentUploadHomeScreen' as const;

export type DocumentAssessmentEntryParams = {
  fromWorkspace?: boolean;
  workspacePreset?: Record<string, unknown>;
  centerTab?: 'upload' | 'books' | 'history';
};

export type DocumentAssessmentNavTarget = {
  screen: typeof DOCUMENT_ASSESSMENT_HOME_SCREEN;
  params?: DocumentAssessmentEntryParams;
};

const DOCUMENT_ENTRY_SCREENS = new Set([
  'DocumentUploadHomeScreen',
  'CreateDocumentQuizScreen',
  'DocumentQuiz',
  'DocumentQuizPage',
]);

/** True when a nav/tile screen belongs to the Document assessment family. */
export function isDocumentAssessmentEntryScreen(screen: string): boolean {
  return DOCUMENT_ENTRY_SCREENS.has(screen);
}

/**
 * Resolve any Document-family entry point to the single Founder-approved home.
 * Does not redirect Handwritten or other modules.
 */
export function resolveDocumentAssessmentNavigation(
  screen: string,
  params?: DocumentAssessmentEntryParams,
): DocumentAssessmentNavTarget | null {
  if (!isDocumentAssessmentEntryScreen(screen)) {
    return null;
  }
  if (!params || Object.keys(params).length === 0) {
    return { screen: DOCUMENT_ASSESSMENT_HOME_SCREEN };
  }
  return { screen: DOCUMENT_ASSESSMENT_HOME_SCREEN, params };
}
