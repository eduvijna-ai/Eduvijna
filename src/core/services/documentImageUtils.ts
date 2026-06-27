import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Resize/compress camera captures for faster local storage and upload. */
export async function compressCameraImage(uri: string): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: 1600 });
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
    context.release();
    image.release();
    return result.uri;
  } catch {
    return uri;
  }
}
