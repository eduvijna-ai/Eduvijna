/**
 * Shared camera → free-form crop → compress pipeline for Document / Handwritten.
 */

import * as ImagePicker from 'expo-image-picker';
import { compressCameraImage } from './documentImageUtils';
import { openImageCropper } from './imageCropSession';

export type CapturedDocumentImage = {
  uri: string;
  name: string;
  mimeType: string;
  fileSize?: number;
};

async function launchCameraOrFallback(): Promise<ImagePicker.ImagePickerResult> {
  try {
    return await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
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
 * Opens the camera, then the free-form crop UI, then compresses.
 * Returns null if the user cancels camera or crop.
 * Retake loops until cancel or a confirmed crop.
 */
export async function captureAndCropDocumentImage(): Promise<CapturedDocumentImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Camera permission is required to capture document pages.');
  }

  // Loop: capture → crop; retake continues until cancel or confirm.
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

    const compressedUri = await compressCameraImage(cropResult.uri);
    return {
      uri: compressedUri,
      name: captured.fileName || `camera-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      fileSize: captured.fileSize,
    };
  }
}
