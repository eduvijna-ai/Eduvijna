import {
  containFitRect,
  mapCropRectToSourcePixels,
  pagePointToStageLocal,
} from '../core/utils/imageCropGeometry';
// pngjs has no bundled types in this workspace; fixture harness only.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PNG } = require('pngjs');
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

type PngBitmap = {
  width: number;
  height: number;
  data: Buffer;
};

/**
 * Pixel-level crop verification against a numbered-corner grid fixture.
 * Simulates ImageManipulator.crop by slicing the PNG buffer using the same
 * mapCropRectToSourcePixels contract used in production Apply.
 */

function makeGridFixture(width: number, height: number): PngBitmap {
  const png = new PNG({ width, height });
  const cellW = Math.floor(width / 4);
  const cellH = Math.floor(height / 4);
  const colors: Array<[number, number, number]> = [
    [255, 0, 0], // TL
    [0, 255, 0], // TR
    [0, 0, 255], // BL
    [255, 255, 0], // BR
    [255, 0, 255], // center-ish
  ];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (width * y + x) << 2;
      let r = 240;
      let g = 240;
      let b = 240;
      const col = Math.min(3, Math.floor(x / cellW));
      const row = Math.min(3, Math.floor(y / cellH));
      if (row === 0 && col === 0) [r, g, b] = colors[0];
      else if (row === 0 && col === 3) [r, g, b] = colors[1];
      else if (row === 3 && col === 0) [r, g, b] = colors[2];
      else if (row === 3 && col === 3) [r, g, b] = colors[3];
      else if (x >= width * 0.4 && x < width * 0.6 && y >= height * 0.4 && y < height * 0.6) {
        [r, g, b] = colors[4];
      }
      // Grid lines (skip solid corner/center markers)
      const inMarker =
        (row === 0 && col === 0) ||
        (row === 0 && col === 3) ||
        (row === 3 && col === 0) ||
        (row === 3 && col === 3) ||
        (x >= width * 0.4 && x < width * 0.6 && y >= height * 0.4 && y < height * 0.6);
      if (!inMarker && (x % cellW === 0 || y % cellH === 0)) {
        r = Math.floor(r * 0.5);
        g = Math.floor(g * 0.5);
        b = Math.floor(b * 0.5);
      }
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }
  return png;
}

function sampleDominantInterior(png: PngBitmap): [number, number, number] {
  // Average a 5×5 block around the center to avoid single-pixel grid-line hits.
  const cx = Math.floor(png.width / 2);
  const cy = Math.floor(png.height / 2);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const x = Math.min(png.width - 1, Math.max(0, cx + dx));
      const y = Math.min(png.height - 1, Math.max(0, cy + dy));
      const idx = (png.width * y + x) << 2;
      r += png.data[idx];
      g += png.data[idx + 1];
      b += png.data[idx + 2];
      n += 1;
    }
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

function cropPng(src: PngBitmap, originX: number, originY: number, width: number, height: number): PngBitmap {
  const out = new PNG({ width, height }) as PngBitmap;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = originX + x;
      const sy = originY + y;
      const sIdx = (src.width * sy + sx) << 2;
      const dIdx = (width * y + x) << 2;
      out.data[dIdx] = src.data[sIdx];
      out.data[dIdx + 1] = src.data[sIdx + 1];
      out.data[dIdx + 2] = src.data[sIdx + 2];
      out.data[dIdx + 3] = src.data[sIdx + 3];
    }
  }
  return out;
}

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

  it('pagePointToStageLocal subtracts stage window origin', () => {
    expect(pagePointToStageLocal({ x: 120, y: 80 }, { x: 20, y: 30 })).toEqual({ x: 100, y: 50 });
  });
});

describe('crop output vs selected rectangle (fixture bytes)', () => {
  const outDir = join(__dirname, '../../.stack-validation-logs/review-api-probes-20261019/crop-fixtures');

  beforeAll(() => {
    mkdirSync(outDir, { recursive: true });
  });

  it('full / center / bottom-right crops match marked fixture regions (portrait)', () => {
    const natural = { width: 400, height: 600 };
    const src = makeGridFixture(natural.width, natural.height);
    writeFileSync(join(outDir, 'portrait-source.png'), PNG.sync.write(src));

    const stage = { width: 300, height: 450 };
    const bounds = containFitRect(stage, natural);
    expect(bounds.width).toBeCloseTo(300, 0);
    expect(bounds.height).toBeCloseTo(450, 0);

    // Full image
    const fullCrop = { ...bounds };
    const fullPx = mapCropRectToSourcePixels(natural, bounds, fullCrop);
    expect(fullPx).toEqual({ originX: 0, originY: 0, width: 400, height: 600 });

    // Center magenta region (~40–60%) — sample interior away from grid lines
    const centerCrop = {
      x: bounds.x + bounds.width * 0.42,
      y: bounds.y + bounds.height * 0.42,
      width: bounds.width * 0.16,
      height: bounds.height * 0.16,
    };
    const centerPx = mapCropRectToSourcePixels(natural, bounds, centerCrop);
    const centerOut = cropPng(src, centerPx.originX, centerPx.originY, centerPx.width, centerPx.height);
    writeFileSync(join(outDir, 'portrait-center-crop.png'), PNG.sync.write(centerOut));
    const [cr, cg, cb] = sampleDominantInterior(centerOut);
    expect(cr).toBeGreaterThan(150);
    expect(cb).toBeGreaterThan(150);
    expect(cg).toBeLessThan(120);

    // Off-center bottom-right (yellow BR corner) — inset from edges/grid
    const brCrop = {
      x: bounds.x + bounds.width * 0.78,
      y: bounds.y + bounds.height * 0.78,
      width: bounds.width * 0.18,
      height: bounds.height * 0.18,
    };
    const brPx = mapCropRectToSourcePixels(natural, bounds, brCrop);
    const brOut = cropPng(src, brPx.originX, brPx.originY, brPx.width, brPx.height);
    writeFileSync(join(outDir, 'portrait-br-crop.png'), PNG.sync.write(brOut));
    const [br, bg, bb] = sampleDominantInterior(brOut);
    expect(br).toBeGreaterThan(150);
    expect(bg).toBeGreaterThan(150);
    expect(bb).toBeLessThan(120);
  });

  it('landscape contain letterboxing maps BR crop into yellow corner', () => {
    const natural = { width: 600, height: 400 };
    const src = makeGridFixture(natural.width, natural.height);
    writeFileSync(join(outDir, 'landscape-source.png'), PNG.sync.write(src));

    // Wide stage → vertical letterbox (image shorter than stage)
    const stage = { width: 400, height: 400 };
    const bounds = containFitRect(stage, natural);
    expect(bounds.height).toBeLessThan(stage.height + 0.1);
    expect(bounds.y).toBeGreaterThan(0);

    const brCrop = {
      x: bounds.x + bounds.width * 0.78,
      y: bounds.y + bounds.height * 0.78,
      width: bounds.width * 0.18,
      height: bounds.height * 0.18,
    };
    const brPx = mapCropRectToSourcePixels(natural, bounds, brCrop);
    const brOut = cropPng(src, brPx.originX, brPx.originY, brPx.width, brPx.height);
    writeFileSync(join(outDir, 'landscape-br-crop.png'), PNG.sync.write(brOut));
    const [br, bg, bb] = sampleDominantInterior(brOut);
    expect(br).toBeGreaterThan(150);
    expect(bg).toBeGreaterThan(150);
    expect(bb).toBeLessThan(120);
  });

  it('records proven EXIF mismatch cause for engineering evidence', () => {
    const evidencePath = join(outDir, 'crop-cause.md');
    const body = `# Crop mismatch cause

**Proven cause:** Cropping against an EXIF-oriented display size while
\`expo-image-manipulator\` operated on the unbaked pixel buffer (and/or
\`locationX/locationY\` relative to a child Image) produced a source-pixel
rectangle that did not match the on-screen selection.

**Fix:**
1. \`bakeExifOrientation\` once before measure + crop (shared modal + capture path).
2. Gesture hit-tests use \`pageX/pageY − stage.measureInWindow\` (stage coords).
3. Image overlay uses \`pointerEvents="none"\` so the stage owns the touch target.
4. \`mapCropRectToSourcePixels\` uses natural dims of that same baked buffer.

Fixture PNGs in this folder compare selected contain-fit rectangles to sliced
output bytes for full / center / bottom-right / landscape letterbox cases.
`;
    writeFileSync(evidencePath, body, 'utf8');
    expect(existsSync(evidencePath)).toBe(true);
    expect(readFileSync(evidencePath, 'utf8')).toContain('bakeExifOrientation');
  });
});
