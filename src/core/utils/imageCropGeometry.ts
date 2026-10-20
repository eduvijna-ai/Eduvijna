/**
 * Pure crop-rect → source-pixel mapping for ImageCropModal / Apply.
 * Kept free of native modules so Jest can assert geometry.
 *
 * Contract: `natural` must be the dimensions of the same decoded pixel buffer
 * that ImageManipulator will crop (EXIF already baked). `displayBounds` must be
 * the contain-fit rectangle of that image inside the stage coordinate system.
 * `crop` and gesture hit-tests must share that same stage coordinate system.
 */

export type CropRect = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Contain-fit display rectangle for an image inside a stage (letterboxing). */
export function containFitRect(stage: Size, natural: Size): CropRect {
  if (!stage.width || !stage.height || !natural.width || !natural.height) {
    return { x: 0, y: 0, width: stage.width || 0, height: stage.height || 0 };
  }
  const scale = Math.min(stage.width / natural.width, stage.height / natural.height);
  const width = natural.width * scale;
  const height = natural.height * scale;
  return {
    x: (stage.width - width) / 2,
    y: (stage.height - height) / 2,
    width,
    height,
  };
}

/**
 * Convert a screen/page point into stage-local coordinates using the stage's
 * window origin from measureInWindow. Prefer this over locationX/locationY when
 * child Image views may be the native touch target.
 */
export function pagePointToStageLocal(
  pagePoint: Point,
  stageWindowOrigin: Point,
): Point {
  return {
    x: pagePoint.x - stageWindowOrigin.x,
    y: pagePoint.y - stageWindowOrigin.y,
  };
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
