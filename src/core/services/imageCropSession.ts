/**
 * Promise-based image crop session.
 * ImageCropModalHost subscribes and resolves the pending promise.
 */

export type CropSessionResult = 'cancelled' | 'retake' | { uri: string };

type CropRequest = {
  uri: string;
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

/**
 * Open the global crop UI for `uri`.
 * Resolves with cropped `{ uri }`, `'cancelled'`, or `'retake'`.
 * Starting a new crop cancels any in-flight session.
 */
export function openImageCropper(uri: string): Promise<CropSessionResult> {
  if (pending) {
    const previous = pending;
    pending = null;
    previous.resolve('cancelled');
  }

  return new Promise<CropSessionResult>((resolve) => {
    pending = { uri, resolve };
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
