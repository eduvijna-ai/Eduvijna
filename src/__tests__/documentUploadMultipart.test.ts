import { appendDocumentUploadPart } from '../core/utils/documentUploadMultipart';

describe('documentUploadMultipart', () => {
  it('appends native URI object on non-web payloads', () => {
    const fd = new FormData();
    appendDocumentUploadPart(fd, 'files', {
      uri: 'file:///tmp/page.png',
      name: 'page.png',
      mimeType: 'image/png',
    });
    expect(fd.get('files')).toBeTruthy();
  });

  it('appends File/Blob on web payloads without converting to URI', () => {
    const fd = new FormData();
    const blob = new Blob(['hello'], { type: 'application/pdf' });
    appendDocumentUploadPart(fd, 'files', {
      file: blob,
      name: 'lesson.pdf',
      mimeType: 'application/pdf',
    });
    const part = fd.get('files');
    expect(part).toBeInstanceOf(Blob);
  });
});
