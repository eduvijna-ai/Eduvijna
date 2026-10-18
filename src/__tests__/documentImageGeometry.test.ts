import {
  computeAspectPreservingResize,
  computeContainFitBitmapSize,
  computePdfContainDrawRect,
  fileNameForMime,
  inferMimeFromNameOrUri,
  preferFullPageSource,
} from '../core/utils/documentImageGeometry';

const MAX_EDGE = 1600;

describe('document image geometry contracts', () => {
  it('preserves portrait aspect when long-edge capped', () => {
    const out = computeAspectPreservingResize(1200, 2400, MAX_EDGE);
    expect(out.height).toBe(MAX_EDGE);
    expect(out.width).toBe(800);
    expect(out.width / out.height).toBeCloseTo(1200 / 2400, 5);
  });

  it('preserves landscape aspect when long-edge capped', () => {
    const out = computeAspectPreservingResize(3200, 1800, MAX_EDGE);
    expect(out.width).toBe(MAX_EDGE);
    expect(out.height).toBe(900);
    expect(out.width / out.height).toBeCloseTo(3200 / 1800, 5);
  });

  it('does not upscale images already within max edge', () => {
    expect(computeAspectPreservingResize(800, 600, MAX_EDGE)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it('contain-fits bitmap inside page without cropping either axis', () => {
    const portrait = computeContainFitBitmapSize({ width: 1000, height: 2000 }, { width: 1224, height: 1584 });
    expect(portrait.width).toBeLessThanOrEqual(1224);
    expect(portrait.height).toBeLessThanOrEqual(1584);
    expect(portrait.width / portrait.height).toBeCloseTo(0.5, 5);

    const landscape = computeContainFitBitmapSize({ width: 2000, height: 1000 }, { width: 1224, height: 1584 });
    expect(landscape.width).toBe(1224);
    expect(landscape.height).toBeLessThan(1584);
  });

  it('PDF contain draw rect centers full content (letterbox, no cover-crop)', () => {
    const pageW = 612;
    const pageH = 792;
    const portrait = computePdfContainDrawRect({ width: 800, height: 1600 }, pageW, pageH);
    expect(portrait.width).toBeLessThanOrEqual(pageW);
    expect(portrait.height).toBeCloseTo(pageH, 5);
    expect(portrait.x).toBeGreaterThan(0);
    expect(portrait.y).toBeCloseTo(0, 5);

    const landscape = computePdfContainDrawRect({ width: 1600, height: 800 }, pageW, pageH);
    expect(landscape.width).toBeCloseTo(pageW, 5);
    expect(landscape.height).toBeLessThan(pageH);
    expect(landscape.y).toBeGreaterThan(0);
  });

  it('prefers full page fileUri over thumbnail for OCR/preview source', () => {
    expect(
      preferFullPageSource({
        fileUri: 'file:///pages/full.jpg',
        thumbnailUri: 'file:///pages/thumb.jpg',
      }),
    ).toBe('file:///pages/full.jpg');
  });

  it('keeps MIME/filename consistent when JPEG conversion fails', () => {
    expect(inferMimeFromNameOrUri('scan.heic')).toBe('image/heic');
    expect(fileNameForMime('scan.heic', 'image/heic', 'page')).toBe('scan.heic');
    expect(fileNameForMime('scan.heic', 'image/jpeg', 'page')).toBe('scan.jpg');
    expect(fileNameForMime('notes.PNG', 'image/png', 'page')).toBe('notes.png');
  });
});
