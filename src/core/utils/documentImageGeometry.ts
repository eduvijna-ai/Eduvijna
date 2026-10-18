/**
 * Pure geometry for document image normalize + PDF contain placement.
 * Kept free of expo-image-manipulator so Jest can assert contracts without native mocks.
 */

export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

/** Aspect-preserving long-edge resize target (never crops). */
export function computeAspectPreservingResize(
  width: number,
  height: number,
  maxEdge: number,
): Size {
  if (!width || !height || !maxEdge) {
    return { width: Math.max(1, width || 1), height: Math.max(1, height || 1) };
  }
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) {
    return { width, height };
  }
  if (width >= height) {
    return {
      width: maxEdge,
      height: Math.max(1, Math.round((height / width) * maxEdge)),
    };
  }
  return {
    width: Math.max(1, Math.round((width / height) * maxEdge)),
    height: maxEdge,
  };
}

/**
 * Contain-fit bitmap size inside a page (no crop). Used before PDF placement.
 */
export function computeContainFitBitmapSize(
  src: Size,
  page: Size,
): Size {
  if (!src.width || !src.height || !page.width || !page.height) {
    return { width: Math.max(1, page.width), height: Math.max(1, page.height) };
  }
  const srcAspect = src.width / src.height;
  const pageAspect = page.width / page.height;
  if (srcAspect > pageAspect) {
    return {
      width: page.width,
      height: Math.max(1, Math.round(page.width / srcAspect)),
    };
  }
  return {
    width: Math.max(1, Math.round(page.height * srcAspect)),
    height: page.height,
  };
}

/**
 * PDF content stream placement: scale image to fit MediaBox (contain), centered.
 * Full content preserved; letterboxing is outside the image draw rect.
 */
export function computePdfContainDrawRect(
  image: Size,
  pageWidthPt: number,
  pageHeightPt: number,
): Rect {
  const imgAspect = image.width / Math.max(1, image.height);
  const pageAspect = pageWidthPt / pageHeightPt;
  let drawW: number;
  let drawH: number;
  if (imgAspect > pageAspect) {
    drawW = pageWidthPt;
    drawH = pageWidthPt / imgAspect;
  } else {
    drawH = pageHeightPt;
    drawW = pageHeightPt * imgAspect;
  }
  return {
    x: (pageWidthPt - drawW) / 2,
    y: (pageHeightPt - drawH) / 2,
    width: drawW,
    height: drawH,
  };
}

/**
 * Prefer the full page file URI over any derived thumbnail for preview/OCR.
 */
export function preferFullPageSource(page: {
  fileUri?: string;
  thumbnailUri?: string;
}): string | undefined {
  return page.fileUri || page.thumbnailUri || undefined;
}

export function inferMimeFromNameOrUri(
  nameOrUri: string,
  fallback = 'application/octet-stream',
): string {
  const lower = String(nameOrUri || '').toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.includes('.jpg?')) {
    return 'image/jpeg';
  }
  if (lower.endsWith('.png') || lower.includes('.png?')) return 'image/png';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return fallback;
}

/** Keep extension aligned with MIME when JPEG conversion succeeds or fails. */
export function fileNameForMime(originalName: string, mimeType: string, fallbackStem: string): string {
  const stem = String(originalName || fallbackStem)
    .replace(/\.[^/.]+$/, '')
    .trim() || fallbackStem;
  if (mimeType === 'image/jpeg') return `${stem}.jpg`;
  if (mimeType === 'image/png') return `${stem}.png`;
  if (mimeType === 'image/heic' || mimeType === 'image/heif') return `${stem}.heic`;
  if (mimeType === 'image/webp') return `${stem}.webp`;
  return originalName || `${fallbackStem}.bin`;
}
