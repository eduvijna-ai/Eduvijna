/** Screens rendered by the web sidebar shell (App.tsx switch). */

export const DOCUMENT_UPLOAD_WEB_SCREENS = [
  'DocumentUploadHomeScreen',
  'DocumentUploadPreviewScreen',
  'DocumentUploadHistoryScreen',
  'DocumentUploadQuizScreen',
  'DocumentLibraryScreen',
  'BookPageViewerScreen',
  'WorksheetScreen',
] as const;

export type DocumentUploadWebScreen = (typeof DOCUMENT_UPLOAD_WEB_SCREENS)[number];

export type WebShellScreen =
  | 'dashboard'
  | 'assessments'
  | 'analytics'
  | 'profile'
  | 'notifications'
  | 'theme'
  | 'students'
  | 'classes'
  | 'ClassesList'
  | 'StudentList'
  | 'Assessments'
  | 'CreateAIQuizScreen'
  | 'CreateDocumentQuizScreen'
  | 'CreateImageQuizScreen'
  | 'CreateYouTubeQuizScreen'
  | 'CreateWebsiteQuizScreen'
  | 'CreateHandwrittenQuizScreen'
  | 'QuizPreviewScreen'
  | 'QuizResultsScreen'
  | 'QuizTakingScreen'
  | 'QuizStatusScreen'
  | 'QuizLoadingScreen'
  | 'ERP'
  | DocumentUploadWebScreen;

export function isDocumentUploadWebScreen(screen: string): boolean {
  return (DOCUMENT_UPLOAD_WEB_SCREENS as readonly string[]).includes(screen);
}

export function isRegisteredWebShellScreen(screen: string): boolean {
  const base = new Set<string>([
    'dashboard',
    'assessments',
    'analytics',
    'profile',
    'notifications',
    'theme',
    'students',
    'classes',
    'ClassesList',
    'StudentList',
    'Assessments',
    'CreateAIQuizScreen',
    'CreateDocumentQuizScreen',
    'CreateImageQuizScreen',
    'CreateYouTubeQuizScreen',
    'CreateWebsiteQuizScreen',
    'CreateHandwrittenQuizScreen',
    'QuizPreviewScreen',
    'QuizResultsScreen',
    'QuizTakingScreen',
    'QuizStatusScreen',
    'QuizLoadingScreen',
    'ERP',
    'WorksheetScreen',
    ...DOCUMENT_UPLOAD_WEB_SCREENS,
  ]);
  return base.has(screen);
}
