/**
 * Pure crop-rect → source-pixel mapping for ImageCropModal / Apply.
 * Kept free of native modules so Jest can assert geometry.
 */

export type CropRect = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Map a crop rectangle drawn in the displayed image bounds to source pixels.
 * Assumes the image is shown with contain-fit (bounds match displayed image box).
 */
export function mapCropRectToSourcePixels(
  natural: Size,
  displayBounds: CropRect,
  crop: CropRect,
): { originX: number; originY: number; width: number; height: number } {
  if (!natural.width || !natural.height || !displayBounds.width || !displayBounds.height) {
    return { originX: 0, originY: 0, width: 1, height: 1 };
  }
  const scaleX = natural.width / displayBounds.width;
  const scaleY = natural.height / displayBounds.height;

  let originX = Math.round((crop.x - displayBounds.x) * scaleX);
  let originY = Math.round((crop.y - displayBounds.y) * scaleY);
  let width = Math.round(crop.width * scaleX);
  let height = Math.round(crop.height * scaleY);

  originX = clamp(originX, 0, natural.width - 1);
  originY = clamp(originY, 0, natural.height - 1);
  width = clamp(width, 1, natural.width - originX);
  height = clamp(height, 1, natural.height - originY);

  return { originX, originY, width, height };
}
