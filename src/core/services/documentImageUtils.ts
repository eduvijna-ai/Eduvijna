import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Image as RNImage } from 'react-native';

/** Max long-edge for OCR/upload derivatives (aspect preserved). */
export const DOCUMENT_IMAGE_MAX_EDGE = 1600;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (err) => reject(err),
    );
  });
}

/**
 * Bake EXIF orientation into pixels once, then optionally downscale while
 * preserving aspect ratio. Never crops. A single manipulate+save avoids
 * double-rotation (no separate rotate after bake).
 */
export async function normalizeAndCompressImage(
  uri: string,
  options?: { maxEdge?: number; compress?: number },
): Promise<string> {
  const maxEdge = options?.maxEdge ?? DOCUMENT_IMAGE_MAX_EDGE;
  const compress = options?.compress ?? 0.75;
  try {
    let width: number | undefined;
    let height: number | undefined;
    try {
      const size = await getImageSize(uri);
      width = size.width;
      height = size.height;
    } catch {
      // Proceed without pre-size; manipulator still re-encodes (EXIF bake).
    }

    const context = ImageManipulator.manipulate(uri);
    if (width && height) {
      const longEdge = Math.max(width, height);
      if (longEdge > maxEdge) {
        if (width >= height) {
          context.resize({ width: maxEdge });
        } else {
          context.resize({ height: maxEdge });
        }
      }
    } else {
      // Unknown size: cap width only (aspect preserved by manipulator).
      context.resize({ width: maxEdge });
    }
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress, format: SaveFormat.JPEG });
    context.release();
    image.release();
    return result.uri;
  } catch {
    return uri;
  }
}

/** Resize/compress camera captures for faster local storage and upload. */
export async function compressCameraImage(uri: string): Promise<string> {
  return normalizeAndCompressImage(uri, { maxEdge: DOCUMENT_IMAGE_MAX_EDGE, compress: 0.75 });
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
 * Scale image to fit inside the page (contain), centered — no edge crop.
 * Unused letterbox regions are left as JPEG white via a full-page canvas resize
 * after fitting (stretch only the fitted bitmap into its contain box is not
 * enough for PDF; we letterbox by placing on a white page via cover of a
 * padded intermediate).
 */
async function containFitToPage(uri: string, pageW: number, pageH: number): Promise<string> {
  const { width: srcW, height: srcH } = await getImageSize(uri);
  if (!srcW || !srcH) {
    throw new Error('Could not read image dimensions.');
  }

  const srcAspect = srcW / srcH;
  const pageAspect = pageW / pageH;

  let fitW: number;
  let fitH: number;
  if (srcAspect > pageAspect) {
    fitW = pageW;
    fitH = Math.max(1, Math.round(pageW / srcAspect));
  } else {
    fitH = pageH;
    fitW = Math.max(1, Math.round(pageH * srcAspect));
  }

  const resizeContext = ImageManipulator.manipulate(uri);
  resizeContext.resize({ width: fitW, height: fitH });
  const resized = await resizeContext.renderAsync();
  const fitted = await resized.saveAsync({ compress: 0.92, format: SaveFormat.JPEG });
  resizeContext.release();
  resized.release();

  // If already exact page size, done.
  if (fitW === pageW && fitH === pageH) {
    return fitted.uri;
  }

  // Pad to exact page by creating a white canvas via a second contain-then-stretch
  // path: export fitted image as-is for PDF MediaBox matching fitted pixel size
  // (variable page size). Callers use fixed MediaBox — so pad by compositing.
  // Without a canvas API, stretch the fitted image to page (minor letterbox loss
  // of whitespace only when aspect differs). Prefer no crop of content:
  // return fitted at its natural size and let PDF page match image pixels.
  return fitted.uri;
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
 * Each photo is aspect-fit (contain) — full content preserved; no center cover-crop.
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
    let pixelW = BITMAP_WIDTH;
    let pixelH = BITMAP_HEIGHT;
    try {
      jpegUri = await containFitToPage(uris[i], BITMAP_WIDTH, BITMAP_HEIGHT);
      const fittedSize = await getImageSize(jpegUri);
      pixelW = fittedSize.width || BITMAP_WIDTH;
      pixelH = fittedSize.height || BITMAP_HEIGHT;
    } catch {
      jpegUri = await stretchToPage(uris[i], BITMAP_WIDTH, BITMAP_HEIGHT);
      pixelW = BITMAP_WIDTH;
      pixelH = BITMAP_HEIGHT;
    }

    const base64 = await FileSystem.readAsStringAsync(jpegUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    jpegPages.push({
      jpeg: base64ToUint8Array(base64),
      pixelW,
      pixelH,
    });
  }

  // Use letter MediaBox; draw each image scaled to fit (contain) inside the page.
  const pdfBytes = buildPdfFromJpegsContain(jpegPages, PAGE_WIDTH, PAGE_HEIGHT);
  const outUri = `${FileSystem.cacheDirectory}gallery-combined-${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(outUri, uint8ArrayToBase64(pdfBytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return outUri;
}

/**
 * Like buildPdfFromJpegs, but scales each JPEG to fit the MediaBox (contain)
 * so portrait/landscape pages keep full content with letterboxing in the PDF.
 */
function buildPdfFromJpegsContain(
  pages: Array<{ jpeg: Uint8Array; pixelW: number; pixelH: number }>,
  pageWidthPt: number,
  pageHeightPt: number,
): Uint8Array {
  if (pages.length === 0) {
    throw new Error('No JPEG pages to write.');
  }

  const parts: Uint8Array[] = [];
  const offsets: number[] = [0];
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

    const imgAspect = pixelW / Math.max(1, pixelH);
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
    const ox = (pageWidthPt - drawW) / 2;
    const oy = (pageHeightPt - drawH) / 2;

    const contentStream = `q\n${drawW} 0 0 ${drawH} ${ox} ${oy} cm\n/Im${i} Do\nQ\n`;
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
