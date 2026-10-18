/**
 * Shared camera → (optional crop) → EXIF-normalize + aspect-preserving compress
 * pipeline for Document / Handwritten.
 *
 * Capture preserves the full frame unless the caller opens the cropper and the
 * user explicitly crops. Gallery picks skip crop entirely.
 */

import * as ImagePicker from 'expo-image-picker';
import { compressCameraImage } from './documentImageUtils';
import { openImageCropper } from './imageCropSession';

export type CapturedDocumentImage = {
  uri: string;
  name: string;
  mimeType: string;
  fileSize?: number;
  /** Pre-compress source when available (same as uri after normalize). */
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
    // Web / environments without a camera API: fall back to library picker.
    return ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 1,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
  }
}

/**
 * Opens the camera and saves the complete frame (EXIF-normalized + compressed).
 * Does not open the crop UI — crop only when the user opts in via openImageCropper.
 * Returns null if the user cancels the camera.
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
  const compressedUri = await compressCameraImage(captured.uri);
  return {
    uri: compressedUri,
    sourceUri: compressedUri,
    name: captured.fileName || `camera-${Date.now()}.jpg`,
    mimeType: 'image/jpeg',
    fileSize: captured.fileSize,
  };
}

/**
 * Captures a full frame (no mandatory crop). Kept for call-site compatibility.
 * Optional crop: pass `opts.offerCrop: true` to open the cropper after capture;
 * "Use full image" in the crop UI keeps the complete frame.
 */
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

    // cropResult.uri is either cropped or original ("Use full image").
    const compressedUri = await compressCameraImage(cropResult.uri);
    return {
      uri: compressedUri,
      sourceUri: compressedUri,
      name: captured.fileName || `camera-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      fileSize: captured.fileSize,
    };
  }
}
