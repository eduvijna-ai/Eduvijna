/**
 * Generates launcher icons from the official stacked EduVijna book+wordmark.
 *
 * Output:
 * - assets/icon.png — opaque white square (iOS / Expo main icon)
 * - assets/android-adaptive-foreground.png — transparent FG with mark in safe zone
 *
 * Android adaptive background is white (#FFFFFF) in app.json.
 * Artwork: dark-teal stacked mark, book above "EduVijna", fully inside safe area.
 */
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets');

const SIZE = 1024;
/**
 * Book-only marks used 0.58. The stacked book+wordmark is wider, so we size by
 * the mark's bounding circle to keep tips + full "EduVijna" inside the ~66% safe zone.
 */
const LEGACY_SAFE_RATIO = 0.58;
const ANDROID_SAFE_DIAMETER_RATIO = 0.66;
const WHITE = { r: 255, g: 255, b: 255, alpha: 255 };

/**
 * Load stacked source (teal mark on black), trim empty margins, keep teal opaque
 * and convert near-black background to transparency.
 */
async function loadStackedMark() {
  const source = join(assetsDir, 'eduvijna.png');
  const trimmed = sharp(source).trim({ threshold: 12 });
  const { data, info } = await trimmed.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Near-black canvas → transparent; keep teal anti-aliased edges intact.
    if (r < 28 && g < 28 && b < 28) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png();
}

async function measureOpaqueBounds(pngBuffer) {
  const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 32) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY, width: info.width, height: info.height };
}

/**
 * Resize so the mark's bounding circle fits inside Android's adaptive safe circle,
 * while not exceeding the legacy 0.58 box used for book-only icons.
 */
async function fitStackedMark(logo, canvasSize, { opaqueWhite = false } = {}) {
  const maxBox = Math.round(canvasSize * LEGACY_SAFE_RATIO);
  const firstPass = await logo
    .clone()
    .resize(maxBox, maxBox, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  const bounds = await measureOpaqueBounds(firstPass);
  const halfW = Math.max(Math.abs(bounds.minX - bounds.width / 2), Math.abs(bounds.maxX - bounds.width / 2));
  const halfH = Math.max(Math.abs(bounds.minY - bounds.height / 2), Math.abs(bounds.maxY - bounds.height / 2));
  const radius = Math.hypot(halfW, halfH);
  const safeRadius = (canvasSize * ANDROID_SAFE_DIAMETER_RATIO) / 2;
  const scale = radius > 0 ? Math.min(1, (safeRadius - 2) / radius) : 1;

  const targetW = Math.max(1, Math.round((bounds.maxX - bounds.minX + 1) * scale));
  const targetH = Math.max(1, Math.round((bounds.maxY - bounds.minY + 1) * scale));

  const resized = await logo
    .clone()
    .resize(targetW, targetH, { fit: 'fill', withoutEnlargement: false })
    .png()
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const left = Math.round((canvasSize - (meta.width || 0)) / 2);
  const top = Math.round((canvasSize - (meta.height || 0)) / 2);

  const background = opaqueWhite
    ? { r: WHITE.r, g: WHITE.g, b: WHITE.b, alpha: 1 }
    : { r: 0, g: 0, b: 0, alpha: 0 };

  return {
    image: sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background,
      },
    })
      .composite([{ input: resized, left, top }])
      .png(),
    appliedScale: scale,
    safeRadius,
  };
}

async function main() {
  const logo = await loadStackedMark();

  // Trimmed transparent stacked mark for in-app surfaces (login header, etc.).
  const stackedUiPath = join(assetsDir, 'eduvijna_stacked_transparent.png');
  await logo.clone().png().toFile(stackedUiPath);
  console.log('Wrote', stackedUiPath);

  const foregroundPath = join(assetsDir, 'android-adaptive-foreground.png');
  const fg = await fitStackedMark(logo, SIZE, { opaqueWhite: false });
  await fg.image.toFile(foregroundPath);
  console.log('Wrote', foregroundPath);

  // iOS / main Expo icon: opaque white square with the same safe-zone sizing.
  const iconPath = join(assetsDir, 'icon.png');
  const icon = await fitStackedMark(logo, SIZE, { opaqueWhite: true });
  await icon.image.flatten({ background: '#FFFFFF' }).png().toFile(iconPath);
  console.log('Wrote', iconPath);

  console.log(
    JSON.stringify({
      size: SIZE,
      legacySafeRatio: LEGACY_SAFE_RATIO,
      androidSafeDiameterRatio: ANDROID_SAFE_DIAMETER_RATIO,
      appliedScale: fg.appliedScale,
      source: 'assets/eduvijna.png',
      androidBackgroundColor: '#FFFFFF',
      mark: 'stacked book + EduVijna wordmark, dark teal on white',
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
