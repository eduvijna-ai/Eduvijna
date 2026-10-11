/**
 * In-memory web/native picker blobs keyed by local book id (not persisted to AsyncStorage).
 */

const uploadFilesByBookId = new Map<string, File | Blob>();

export function rememberDocumentUploadFile(bookId: string, file: File | Blob): void {
  uploadFilesByBookId.set(bookId, file);
}

export function getDocumentUploadFile(bookId: string): File | Blob | undefined {
  return uploadFilesByBookId.get(bookId);
}

export function clearDocumentUploadFile(bookId: string): void {
  uploadFilesByBookId.delete(bookId);
}
