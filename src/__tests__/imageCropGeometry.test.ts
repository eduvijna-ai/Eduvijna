import { mapCropRectToSourcePixels } from '../core/utils/imageCropGeometry';

describe('mapCropRectToSourcePixels', () => {
  it('maps display crop rect to source pixels with contain-fit bounds', () => {
    const natural = { width: 1000, height: 2000 };
    const bounds = { x: 50, y: 0, width: 200, height: 400 };
    const crop = { x: 50, y: 0, width: 200, height: 400 };
    const out = mapCropRectToSourcePixels(natural, bounds, crop);
    expect(out.originX).toBe(0);
    expect(out.originY).toBe(0);
    expect(out.width).toBe(1000);
    expect(out.height).toBe(2000);
  });

  it('clamps crop that would exceed natural image edges', () => {
    const natural = { width: 100, height: 100 };
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const crop = { x: -10, y: -10, width: 200, height: 200 };
    const out = mapCropRectToSourcePixels(natural, bounds, crop);
    expect(out.originX).toBeGreaterThanOrEqual(0);
    expect(out.originY).toBeGreaterThanOrEqual(0);
    expect(out.originX + out.width).toBeLessThanOrEqual(100);
    expect(out.originY + out.height).toBeLessThanOrEqual(100);
  });
});
