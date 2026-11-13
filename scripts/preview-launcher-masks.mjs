import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs/development/evidence/20261113-login-icon-branding');
mkdirSync(outDir, { recursive: true });

const fgPath = join(root, 'assets/android-adaptive-foreground.png');
const fg = await sharp(fgPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const size = fg.info.width;
const cx = size / 2;
const cy = size / 2;
let minX = size;
let minY = size;
let maxX = 0;
let maxY = 0;
let count = 0;
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const a = fg.data[(y * size + x) * 4 + 3];
    if (a > 32) {
      count += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}
const farthestCorner = Math.hypot(
  Math.max(Math.abs(minX - cx), Math.abs(maxX - cx)),
  Math.max(Math.abs(minY - cy), Math.abs(maxY - cy)),
);
const safeRadius = size * 0.33;
console.log({
  bbox: [minX, minY, maxX, maxY],
  count,
  farthestCorner: Math.round(farthestCorner),
  safeRadius: Math.round(safeRadius),
  insideSafe: farthestCorner <= safeRadius + 4,
});

const preview = 432;
const fgResized = await sharp(fgPath).resize(preview, preview).png().toBuffer();
await sharp({
  create: { width: preview, height: preview, channels: 3, background: '#FFFFFF' },
})
  .composite([{ input: fgResized }])
  .png()
  .toFile(join(outDir, 'android-launcher-preview-square.png'));

const circleSvg = Buffer.from(
  `<svg width="${preview}" height="${preview}"><circle cx="${preview / 2}" cy="${preview / 2}" r="${preview / 2}" fill="white"/></svg>`,
);
const circled = await sharp({
  create: { width: preview, height: preview, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
})
  .composite([{ input: fgResized }])
  .png()
  .toBuffer();

await sharp(circled)
  .composite([{ input: await sharp(circleSvg).png().toBuffer(), blend: 'dest-in' }])
  .png()
  .toFile(join(outDir, 'android-launcher-preview-circle.png'));

console.log('wrote previews to', outDir);
