/**
 * Platform multipart file parts (web File/Blob vs native URI object).
 */

export type DocumentPickerWebFile = {
  uri?: string;
  name?: string;
  mimeType?: string;
  file?: File | Blob;
};

export function appendDocumentUploadPart(
  formData: FormData,
  fieldName: string,
  input: DocumentPickerWebFile,
): void {
  if (input.file instanceof Blob) {
    const name = input.name || 'upload.bin';
    const file =
      input.file instanceof File ? input.file : new File([input.file], name, { type: input.mimeType });
    formData.append(fieldName, file);
    return;
  }
  if (!input.uri) {
    throw new Error('document_upload_missing_file');
  }
  formData.append(fieldName, {
    uri: input.uri,
    name: input.name || 'upload.bin',
    type: input.mimeType || 'application/octet-stream',
  } as unknown as Blob);
}
