import { Platform } from 'react-native';

export type PickerAssetLike = {
  uri: string;
  name?: string;
  mimeType?: string;
  size?: number;
  file?: File | Blob;
};

/** Resolve browser File/Blob for multipart uploads (never append native URI objects on web). */
export async function resolvePickerAssetBlob(
  asset: PickerAssetLike,
): Promise<File | Blob | undefined> {
  if (asset.file instanceof Blob) {
    return asset.file;
  }
  if (Platform.OS !== 'web' || !asset.uri) {
    return undefined;
  }
  try {
    const response = await fetch(asset.uri);
    return await response.blob();
  } catch {
    return undefined;
  }
}
