import {
  DOCUMENT_ASSESSMENT_HOME_SCREEN,
  isDocumentAssessmentEntryScreen,
  resolveDocumentAssessmentNavigation,
} from '../core/utils/documentAssessmentNavigation';
import { resolveQuizGenerationNavigation } from '../core/utils/quizGenerationTiles';

describe('documentAssessmentNavigation (Issue 1)', () => {
  it('treats DocumentUploadHomeScreen and CreateDocumentQuizScreen as Document entry screens', () => {
    expect(isDocumentAssessmentEntryScreen('DocumentUploadHomeScreen')).toBe(true);
    expect(isDocumentAssessmentEntryScreen('CreateDocumentQuizScreen')).toBe(true);
    expect(isDocumentAssessmentEntryScreen('CreateHandwrittenQuizScreen')).toBe(false);
  });

  it('resolves all Document entry screens to the same home', () => {
    expect(resolveDocumentAssessmentNavigation('CreateDocumentQuizScreen')).toEqual({
      screen: DOCUMENT_ASSESSMENT_HOME_SCREEN,
    });
    expect(resolveDocumentAssessmentNavigation('DocumentUploadHomeScreen')).toEqual({
      screen: DOCUMENT_ASSESSMENT_HOME_SCREEN,
    });
  });

  it('preserves optional params when provided', () => {
    expect(
      resolveDocumentAssessmentNavigation('CreateDocumentQuizScreen', {
        fromWorkspace: true,
        workspacePreset: { subject: 'Science' },
      }),
    ).toEqual({
      screen: DOCUMENT_ASSESSMENT_HOME_SCREEN,
      params: { fromWorkspace: true, workspacePreset: { subject: 'Science' } },
    });
  });

  it('dashboard and plus-menu resolvers open the same Document screen', () => {
    const fromDashboard = resolveQuizGenerationNavigation('DocumentUploadHomeScreen');
    const fromPlusLegacy = resolveQuizGenerationNavigation('CreateDocumentQuizScreen');
    expect(fromDashboard).toEqual(fromPlusLegacy);
    expect(fromDashboard.screen).toBe('DocumentUploadHomeScreen');
  });
});
