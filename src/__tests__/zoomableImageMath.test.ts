import {
  clampPan,
  clampScale,
  computeContainSize,
  nextPinchScale,
} from '../core/utils/zoomableImageMath';

describe('zoomableImageMath', () => {
  it('computes contain-fit initial size', () => {
    const fitted = computeContainSize({ width: 1000, height: 2000 }, { width: 400, height: 600 });
    expect(fitted.width).toBe(300);
    expect(fitted.height).toBe(600);
  });

  it('clamps pan so scaled content stays reachable within stage', () => {
    const fitted = { width: 200, height: 200 };
    const stage = { width: 200, height: 200 };
    // scale 2 → 400x400; max pan ±100
    expect(clampPan({ x: 500, y: -500 }, fitted, 2, stage)).toEqual({ x: 100, y: -100 });
    expect(clampPan({ x: 0, y: 0 }, fitted, 1, stage)).toEqual({ x: 0, y: 0 });
  });

  it('clamps pinch scale between min and max', () => {
    expect(nextPinchScale(1, 100, 300, 1, 4)).toBe(3);
    expect(nextPinchScale(1, 100, 1000, 1, 4)).toBe(4);
    expect(clampScale(0.2)).toBe(1);
  });
});
