import { QUIZ_NAV_TO_SCREEN, QUIZ_COMPONENT_TO_SCREEN } from '../core/hooks/useQuizNavItems';

describe('document-quiz navigation parity', () => {
  it('maps web document-quiz routes to DocumentUploadHomeScreen', () => {
    expect(QUIZ_NAV_TO_SCREEN['/document-quiz']).toBe('DocumentUploadHomeScreen');
    expect(QUIZ_NAV_TO_SCREEN['/document-assessment']).toBe('DocumentUploadHomeScreen');
    expect(QUIZ_NAV_TO_SCREEN['/document']).toBe('DocumentUploadHomeScreen');
  });

  it('maps legacy component names to DocumentUploadHomeScreen', () => {
    expect(QUIZ_COMPONENT_TO_SCREEN.DocumentQuiz).toBe('DocumentUploadHomeScreen');
    expect(QUIZ_COMPONENT_TO_SCREEN.DocumentQuizPage).toBe('DocumentUploadHomeScreen');
    expect(QUIZ_COMPONENT_TO_SCREEN.CreateDocumentQuizScreen).toBe('DocumentUploadHomeScreen');
  });
});
