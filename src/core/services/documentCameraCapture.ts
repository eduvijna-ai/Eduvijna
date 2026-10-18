/**
 * Shared camera → (optional crop) → EXIF-normalize + aspect-preserving compress
 * pipeline for Document / Handwritten.
 *
 * Capture preserves the full frame unless the caller opens the cropper and the
 * user explicitly crops. Gallery picks skip crop entirely.
 */

import * as ImagePicker from 'expo-image-picker';
import { compressCameraImage, type NormalizedDocumentImage } from './documentImageUtils';
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

/**
 * Opens the camera and saves the complete frame (EXIF-normalized + compressed when possible).
 * MIME/filename always match actual bytes (never claim JPEG if conversion failed).
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
  const normalized = await compressCameraImage(captured.uri, {
    originalName: captured.fileName || `camera-${Date.now()}.jpg`,
    sourceMimeType: sourceMime,
  });
  return toCaptured(normalized, captured.fileName || `camera-${Date.now()}.jpg`, captured.fileSize);
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
    const cropResult = await openImageCropper(captured.uri);

    if (cropResult === 'cancelled') {
      return null;
    }
    if (cropResult === 'retake') {
      continue;
    }

    const sourceMime =
      captured.mimeType ||
      inferMimeFromNameOrUri(captured.fileName || captured.uri, 'image/jpeg');
    const normalized = await compressCameraImage(cropResult.uri, {
      originalName: captured.fileName || `camera-${Date.now()}.jpg`,
      sourceMimeType: sourceMime,
    });
    return toCaptured(normalized, captured.fileName || `camera-${Date.now()}.jpg`, captured.fileSize);
  }
}
