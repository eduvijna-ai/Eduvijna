/**
 * Promise-based image crop session.
 * ImageCropModalHost subscribes and resolves the pending promise.
 */

export type CropCancelledResult = { kind: 'cancelled' };
export type CropRetakeResult = { kind: 'retake' };

/** User kept the current input bytes (no crop applied). MIME must not be relabeled. */
export type CropUnchangedResult = {
  kind: 'unchanged';
  uri: string;
  width?: number;
  height?: number;
};

/** Real JPEG crop written to a new file. */
export type CropAppliedResult = {
  kind: 'cropped';
  uri: string;
  mimeType: 'image/jpeg';
  fileName: string;
  width: number;
  height: number;
};

export type CropSessionResult =
  | CropCancelledResult
  | CropRetakeResult
  | CropUnchangedResult
  | CropAppliedResult;

type CropRequest = {
  uri: string;
  /** Optional base name used when emitting a cropped JPEG filename. */
  suggestedFileName?: string;
  resolve: (result: CropSessionResult) => void;
};

let pending: CropRequest | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore subscriber errors
    }
  });
}

/** Subscribe to pending-crop changes. Returns unsubscribe. */
export function subscribeCropSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPendingCropUri(): string | null {
  return pending?.uri ?? null;
}

export function getPendingCropSuggestedFileName(): string | undefined {
  return pending?.suggestedFileName;
}

/**
 * Open the global crop UI for `uri`.
 * Resolves cancelled | retake | unchanged (current input) | cropped JPEG metadata.
 * Starting a new crop cancels any in-flight session.
 */
export function openImageCropper(
  uri: string,
  options?: { suggestedFileName?: string },
): Promise<CropSessionResult> {
  if (pending) {
    const previous = pending;
    pending = null;
    previous.resolve({ kind: 'cancelled' });
  }

  return new Promise<CropSessionResult>((resolve) => {
    pending = {
      uri,
      suggestedFileName: options?.suggestedFileName,
      resolve,
    };
    notify();
  });
}

export function resolveCropSession(result: CropSessionResult): void {
  if (!pending) return;
  const current = pending;
  pending = null;
  notify();
  current.resolve(result);
}

export function isCropSessionDismissed(result: CropSessionResult): boolean {
  return result.kind === 'cancelled' || result.kind === 'retake';
}

export function cropFileNameFromBase(baseName: string | undefined, fallbackStem: string): string {
  const raw = String(baseName || fallbackStem || 'page').trim() || 'page';
  const stem = raw.replace(/\.[^/.]+$/, '') || 'page';
  const withoutCrop = stem.replace(/_crop$/i, '');
  return `${withoutCrop}_crop.jpg`;
}
