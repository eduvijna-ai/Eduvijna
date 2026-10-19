/**
 * Pure helpers for crop-editor Reset / near-full detection.
 * Rotation itself uses expo-image-manipulator in ImageCropModal.
 */

import type { CropRect } from './imageCropGeometry';

const FULL_CROP_TOLERANCE_PX = 4;

/** True when the crop covers essentially the entire contain-fit image bounds. */
export function isNearlyFullCrop(crop: CropRect, bounds: CropRect, tolerance = FULL_CROP_TOLERANCE_PX): boolean {
  return (
    Math.abs(crop.x - bounds.x) <= tolerance &&
    Math.abs(crop.y - bounds.y) <= tolerance &&
    Math.abs(crop.width - bounds.width) <= tolerance &&
    Math.abs(crop.height - bounds.height) <= tolerance
  );
}

/** Normalize quarter-turn count into 0..3. */
export function normalizeQuarterTurns(turns: number): number {
  const n = ((Math.trunc(turns) % 4) + 4) % 4;
  return n;
}
