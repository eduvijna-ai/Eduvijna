import {
  DOCUMENT_UPLOAD_WEB_SCREENS,
  isDocumentUploadWebScreen,
  isRegisteredWebShellScreen,
} from '../platforms/web/webShellScreens';

describe('web shell document workspace screens', () => {
  it('registers all document-upload downstream routes for web', () => {
    for (const screen of DOCUMENT_UPLOAD_WEB_SCREENS) {
      expect(isRegisteredWebShellScreen(screen)).toBe(true);
      expect(isDocumentUploadWebScreen(screen)).toBe(true);
    }
  });

  it('keeps legacy CreateDocumentQuizScreen registered for deep links', () => {
    expect(isRegisteredWebShellScreen('CreateDocumentQuizScreen')).toBe(true);
  });
});
