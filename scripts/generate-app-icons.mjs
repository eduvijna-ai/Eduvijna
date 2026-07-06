/**
 * Generates Android adaptive-icon foreground and main app icon with safe-zone padding.
 * Android masks icons into circles/squircles — artwork must sit in the inner ~66%.
 */
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets');

const SIZE = 1024;
const SAFE_RATIO = 0.58; // logo fits inside Android adaptive safe zone
const BRAND_BG = '#1B4F5C';

async function loadLogoMark() {
  // White book mark on black — we strip the black to transparency
  const source = join(assetsDir, 'eduvijna_white_logo.png');
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Treat near-black pixels as transparent
    if (r < 30 && g < 30 && b < 30) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png();
}

async function fitOnCanvas(logo, canvasSize, safeRatio) {
  const target = Math.round(canvasSize * safeRatio);
  const resized = await logo
    .resize(target, target, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const left = Math.round((canvasSize - meta.width) / 2);
  const top = Math.round((canvasSize - meta.height) / 2);

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png();
}

async function main() {
  const logo = await loadLogoMark();

  const foregroundPath = join(assetsDir, 'android-adaptive-foreground.png');
  await (await fitOnCanvas(logo, SIZE, SAFE_RATIO)).toFile(foregroundPath);
  console.log('Wrote', foregroundPath);

  const iconPath = join(assetsDir, 'icon.png');
  const foregroundBuffer = await (await fitOnCanvas(logo, SIZE, SAFE_RATIO)).toBuffer();
  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 3,
      background: BRAND_BG,
    },
  })
    .composite([{ input: foregroundBuffer }])
    .png()
    .toFile(iconPath);
  console.log('Wrote', iconPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
