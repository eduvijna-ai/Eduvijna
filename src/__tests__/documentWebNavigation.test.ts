import {
  readDocumentWorkspacePreset,
  withDocumentWorkspaceParams,
  workspacePresetToPreviewFields,
} from '../core/utils/documentWorkspaceParams';

describe('document web navigation params', () => {
  it('preserves workspacePreset through nested navigation params', () => {
    const route = {
      params: {
        workspacePreset: {
          classValue: 'Class 8',
          subject: 'Science',
          lesson: 'Photosynthesis',
          difficulty: 'medium',
          questionCount: 4,
        },
      },
    };
    const next = withDocumentWorkspaceParams(route, {
      book: { id: 'b1' },
      ...workspacePresetToPreviewFields(readDocumentWorkspacePreset(route)),
    });
    expect(next.workspacePreset?.lesson).toBe('Photosynthesis');
    expect(next.presetLesson).toBe('Photosynthesis');
    expect(next.book).toEqual({ id: 'b1' });
  });
});

describe('web shell document screens registry', () => {
  it('includes WorksheetScreen for document worksheet flow', () => {
    const { isRegisteredWebShellScreen } = require('../platforms/web/webShellScreens');
    expect(isRegisteredWebShellScreen('DocumentUploadHomeScreen')).toBe(true);
    expect(isRegisteredWebShellScreen('WorksheetScreen')).toBe(true);
  });
});
