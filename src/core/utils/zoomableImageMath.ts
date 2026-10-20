/**
 * Pure layout math for contain-fit + constrained pan (Android-safe zoom/pan).
 */

export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

/** Aspect-fit size of natural image inside the stage (scale = 1). */
export function computeContainSize(natural: Size, stage: Size): Size {
  if (!natural.width || !natural.height || !stage.width || !stage.height) {
    return { width: Math.max(1, stage.width), height: Math.max(1, stage.height) };
  }
  const scale = Math.min(stage.width / natural.width, stage.height / natural.height);
  return {
    width: Math.max(1, natural.width * scale),
    height: Math.max(1, natural.height * scale),
  };
}

/** Clamp translation so the scaled image cannot be panned beyond the stage. */
export function clampPan(
  translate: Point,
  fitted: Size,
  scale: number,
  stage: Size,
): Point {
  const scaledW = fitted.width * scale;
  const scaledH = fitted.height * scale;
  const maxX = Math.max(0, (scaledW - stage.width) / 2);
  const maxY = Math.max(0, (scaledH - stage.height) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, translate.x)),
    y: Math.min(maxY, Math.max(-maxY, translate.y)),
  };
}

export function clampScale(scale: number, min = 1, max = 4): number {
  return Math.min(max, Math.max(min, scale));
}

export function distanceBetween(
  a: { pageX: number; pageY: number },
  b: { pageX: number; pageY: number },
): number {
  const dx = a.pageX - b.pageX;
  const dy = a.pageY - b.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Next scale from a pinch gesture (start distance → current distance). */
export function nextPinchScale(
  startScale: number,
  startDistance: number,
  currentDistance: number,
  min = 1,
  max = 4,
): number {
  if (!startDistance || startDistance <= 0) return clampScale(startScale, min, max);
  return clampScale(startScale * (currentDistance / startDistance), min, max);
}
