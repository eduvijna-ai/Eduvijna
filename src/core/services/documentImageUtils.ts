import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Image as RNImage } from 'react-native';

/** Resize/compress camera captures for faster local storage and upload. */
export async function compressCameraImage(uri: string): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: 1600 });
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
    context.release();
    image.release();
    return result.uri;
  } catch {
    return uri;
  }
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (err) => reject(err),
    );
  });
}

function base64ToUint8Array(base64: string): Uint8Array {
  const normalized = base64.replace(/[\r\n\s]/g, '');
  if (typeof globalThis.atob !== 'function') {
    throw new Error('Base64 decode is not available in this runtime.');
  }
  const binary = globalThis.atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === 'function') {
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(slice) as number[]);
    }
    return globalThis.btoa(binary);
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    result += chars[(triple >> 18) & 0x3f];
    result += chars[(triple >> 12) & 0x3f];
    result += i + 1 < bytes.length ? chars[(triple >> 6) & 0x3f] : '=';
    result += i + 2 < bytes.length ? chars[triple & 0x3f] : '=';
  }
  return result;
}

/**
 * Scale image to cover target size, then center-crop to exact width x height.
 * Fills the frame with no white bars; edges may be clipped.
 */
async function coverAndCropToPage(uri: string, pageW: number, pageH: number): Promise<string> {
  const { width: srcW, height: srcH } = await getImageSize(uri);
  if (!srcW || !srcH) {
    throw new Error('Could not read image dimensions.');
  }

  const srcAspect = srcW / srcH;
  const pageAspect = pageW / pageH;

  const resizeContext = ImageManipulator.manipulate(uri);
  if (srcAspect > pageAspect) {
    resizeContext.resize({ height: pageH });
  } else {
    resizeContext.resize({ width: pageW });
  }
  const resized = await resizeContext.renderAsync();
  const resizedSaved = await resized.saveAsync({ compress: 0.92, format: SaveFormat.JPEG });
  const rw = resized.width || pageW;
  const rh = resized.height || pageH;
  resizeContext.release();
  resized.release();

  const originX = Math.max(0, Math.floor((rw - pageW) / 2));
  const originY = Math.max(0, Math.floor((rh - pageH) / 2));
  const cropW = Math.min(pageW, rw);
  const cropH = Math.min(pageH, rh);

  const cropContext = ImageManipulator.manipulate(resizedSaved.uri);
  cropContext.crop({ originX, originY, width: cropW, height: cropH });
  if (cropW !== pageW || cropH !== pageH) {
    cropContext.resize({ width: pageW, height: pageH });
  }
  const cropped = await cropContext.renderAsync();
  const saved = await cropped.saveAsync({ compress: 0.88, format: SaveFormat.JPEG });
  cropContext.release();
  cropped.release();
  return saved.uri;
}

/** Last-resort: stretch image to exact page size (may distort, but never blanks). */
async function stretchToPage(uri: string, pageW: number, pageH: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: pageW, height: pageH });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.88, format: SaveFormat.JPEG });
  context.release();
  image.release();
  return saved.uri;
}

function encodeAscii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * Minimal multi-page PDF writer: one full-bleed JPEG image per page.
 * Avoids pdf-lib / expo-print (Metro + blank-page issues on RN).
 */
function buildPdfFromJpegs(
  pages: Array<{ jpeg: Uint8Array; pixelW: number; pixelH: number }>,
  pageWidthPt: number,
  pageHeightPt: number,
): Uint8Array {
  if (pages.length === 0) {
    throw new Error('No JPEG pages to write.');
  }

  const parts: Uint8Array[] = [];
  const offsets: number[] = [0]; // 1-based object offsets; index 0 unused
  let cursor = 0;

  const pushText = (text: string) => {
    const bytes = encodeAscii(text);
    parts.push(bytes);
    cursor += bytes.length;
  };

  const pushBytes = (bytes: Uint8Array) => {
    parts.push(bytes);
    cursor += bytes.length;
  };

  const startObj = (id: number) => {
    offsets[id] = cursor;
    pushText(`${id} 0 obj\n`);
  };

  const endObj = () => {
    pushText('\nendobj\n');
  };

  pushText('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  const pageCount = pages.length;
  const pageObjIds = pages.map((_, i) => 3 + i * 3);

  startObj(1);
  pushText('<< /Type /Catalog /Pages 2 0 R >>');
  endObj();

  startObj(2);
  pushText(
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`,
  );
  endObj();

  for (let i = 0; i < pages.length; i += 1) {
    const pageObj = 3 + i * 3;
    const contentObj = 4 + i * 3;
    const imageObj = 5 + i * 3;
    const { jpeg, pixelW, pixelH } = pages[i];

    const contentStream = `q\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/Im${i} Do\nQ\n`;
    const contentBytes = encodeAscii(contentStream);

    startObj(pageObj);
    pushText(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] ` +
        `/Resources << /XObject << /Im${i} ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`,
    );
    endObj();

    startObj(contentObj);
    pushText(`<< /Length ${contentBytes.length} >>\nstream\n`);
    pushBytes(contentBytes);
    pushText('endstream');
    endObj();

    startObj(imageObj);
    pushText(
      `<< /Type /XObject /Subtype /Image /Width ${pixelW} /Height ${pixelH} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    );
    pushBytes(jpeg);
    pushText('\nendstream');
    endObj();
  }

  const xrefStart = cursor;
  const maxObj = 2 + pageCount * 3;
  pushText(`xref\n0 ${maxObj + 1}\n`);
  pushText('0000000000 65535 f \n');
  for (let id = 1; id <= maxObj; id += 1) {
    pushText(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\n`);
  pushText(`startxref\n${xrefStart}\n%%EOF\n`);

  return concatBytes(parts);
}

/**
 * Combine local image URIs into a single multi-page PDF (exactly one image per page).
 * Each photo is cover-cropped to fill the page (no white space; edges may clip).
 */
export async function combineImagesToPdf(params: {
  imageUris: string[];
  mimeTypes?: string[];
}): Promise<string> {
  const uris = params.imageUris.filter(Boolean);
  if (uris.length === 0) {
    throw new Error('No images to combine into a PDF.');
  }

  // US Letter in PDF points.
  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;
  // 2× bitmap for sharper library page renders.
  const BITMAP_WIDTH = 1224;
  const BITMAP_HEIGHT = 1584;

  const jpegPages: Array<{ jpeg: Uint8Array; pixelW: number; pixelH: number }> = [];

  for (let i = 0; i < uris.length; i += 1) {
    let jpegUri: string;
    try {
      jpegUri = await coverAndCropToPage(uris[i], BITMAP_WIDTH, BITMAP_HEIGHT);
    } catch {
      jpegUri = await stretchToPage(uris[i], BITMAP_WIDTH, BITMAP_HEIGHT);
    }

    const base64 = await FileSystem.readAsStringAsync(jpegUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    jpegPages.push({
      jpeg: base64ToUint8Array(base64),
      pixelW: BITMAP_WIDTH,
      pixelH: BITMAP_HEIGHT,
    });
  }

  const pdfBytes = buildPdfFromJpegs(jpegPages, PAGE_WIDTH, PAGE_HEIGHT);
  const outUri = `${FileSystem.cacheDirectory}gallery-combined-${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(outUri, uint8ArrayToBase64(pdfBytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return outUri;
}
