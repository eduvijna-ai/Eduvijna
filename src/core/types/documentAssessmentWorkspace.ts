/**
 * Shared page model for Camera / Gallery / Library document assessment workspace.
 */

export type DocumentWorkspaceSourceKind = 'camera_gallery' | 'library_book' | 'uploaded_document';

export type DocumentWorkspacePage = {
  /** Stable identity (pageId for local; docId:pageN for library). */
  pageId: string;
  pageNumber: number;
  /** Current display / OCR / PDF source URI. */
  uri?: string;
  thumbnailUri?: string;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  /** True when Crop/Restore are allowed (local camera/gallery pages). */
  editable: boolean;
};

export type DocumentWorkspaceCapabilities = {
  canAddGallery: boolean;
  canAddCamera: boolean;
  canCropRestore: boolean;
  canRemovePages: boolean;
  maxPages: number;
  maxSelection: number;
};
