import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '.stack-validation-logs',
  'founder-manual-assets',
);
mkdirSync(outDir, { recursive: true });

function writePpm(path, width, height, paint) {
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = paint(x, y, width, height);
      const i = (y * width + x) * 3;
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
    }
  }
  writeFileSync(path, Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), pixels]));
}

writePpm(join(outDir, 'edge-markers-portrait.ppm'), 640, 960, (x, y, w, h) => {
  const edge = x < 12 || y < 12 || x >= w - 12 || y >= h - 12;
  return edge ? [220, 40, 40] : [30, 30, 160];
});

writePpm(join(outDir, 'edge-markers-landscape.ppm'), 960, 540, (x, y, w, h) => {
  const edge = x < 12 || y < 12 || x >= w - 12 || y >= h - 12;
  return edge ? [40, 200, 40] : [30, 30, 160];
});

console.log(outDir);
