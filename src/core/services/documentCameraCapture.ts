/**
 * Shared camera → (optional crop) → EXIF-normalize + aspect-preserving compress
 * pipeline for Document / Handwritten.
 *
 * Capture preserves the full frame unless the caller opens the cropper and the
 * user explicitly crops. Gallery picks skip crop entirely.
 */

import * as ImagePicker from 'expo-image-picker';
import {
  bakeExifOrientation,
  compressCameraImage,
  type NormalizedDocumentImage,
} from './documentImageUtils';
import { openImageCropper } from './imageCropSession';
import { inferMimeFromNameOrUri } from '../utils/documentImageGeometry';

export type CapturedDocumentImage = {
  uri: string;
  name: string;
  mimeType: string;
  fileSize?: number;
  convertedToJpeg: boolean;
  sourceUri?: string;
};

async function launchCameraOrFallback(): Promise<ImagePicker.ImagePickerResult> {
  try {
    return await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
      exif: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
  } catch {
    return ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 1,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
  }
}

function toCaptured(
  normalized: NormalizedDocumentImage,
  fallbackName: string,
  fileSize?: number,
): CapturedDocumentImage {
  return {
    uri: normalized.uri,
    sourceUri: normalized.uri,
    name: normalized.fileName || fallbackName,
    mimeType: normalized.mimeType,
    convertedToJpeg: normalized.convertedToJpeg,
    fileSize,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Opens the camera and saves the complete frame (EXIF-normalized + compressed when possible).
 * MIME/filename always match actual bytes (never claim JPEG if conversion failed).
 * Compress/EXIF work is bounded so callers cannot hang forever on capturing spinners.
 */
export async function captureDocumentImage(): Promise<CapturedDocumentImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Camera permission is required to capture document pages.');
  }

  const cameraResult = await launchCameraOrFallback();
  if (cameraResult.canceled || !cameraResult.assets?.length) {
    return null;
  }

  const captured = cameraResult.assets[0];
  const sourceMime =
    captured.mimeType ||
    inferMimeFromNameOrUri(captured.fileName || captured.uri, 'image/jpeg');
  const fallbackName = captured.fileName || `camera-${Date.now()}.jpg`;
  try {
    const normalized = await withTimeout(
      compressCameraImage(captured.uri, {
        originalName: fallbackName,
        sourceMimeType: sourceMime,
      }),
      45000,
      'Image processing timed out after capture. Please try again or use Gallery.',
    );
    return toCaptured(normalized, fallbackName, captured.fileSize);
  } catch (err) {
    // Prefer a usable raw frame over an endless spinner when compress hangs/fails.
    if (captured.uri) {
      return {
        uri: captured.uri,
        sourceUri: captured.uri,
        name: fallbackName,
        mimeType: sourceMime,
        convertedToJpeg: false,
        fileSize: captured.fileSize,
      };
    }
    throw err;
  }
}

export async function captureAndCropDocumentImage(opts?: {
  offerCrop?: boolean;
}): Promise<CapturedDocumentImage | null> {
  if (!opts?.offerCrop) {
    return captureDocumentImage();
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Camera permission is required to capture document pages.');
  }

  for (;;) {
    const cameraResult = await launchCameraOrFallback();
    if (cameraResult.canceled || !cameraResult.assets?.length) {
      return null;
    }

    const captured = cameraResult.assets[0];
    const sourceMime =
      captured.mimeType ||
      inferMimeFromNameOrUri(captured.fileName || captured.uri, 'image/jpeg');
    // Bake EXIF before crop so Image.getSize and manipulator crop share one buffer.
    const oriented = await bakeExifOrientation(captured.uri, {
      originalName: captured.fileName || `camera-${Date.now()}.jpg`,
      sourceMimeType: sourceMime,
    });

    const cropResult = await openImageCropper(oriented.uri, {
      suggestedFileName: oriented.fileName || captured.fileName || undefined,
    });

    if (cropResult.kind === 'cancelled') {
      return null;
    }
    if (cropResult.kind === 'retake') {
      continue;
    }

    const cropMime =
      cropResult.kind === 'cropped'
        ? cropResult.mimeType
        : oriented.mimeType || sourceMime;
    const sourceUri = cropResult.uri;
    const originalName =
      cropResult.kind === 'cropped'
        ? cropResult.fileName
        : oriented.fileName || captured.fileName || `camera-${Date.now()}.jpg`;
    const normalized = await compressCameraImage(sourceUri, {
      originalName,
      sourceMimeType: cropMime,
    });
    return toCaptured(normalized, originalName, captured.fileSize);
  }
}
