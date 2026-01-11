import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const ASSETS_DIR = path.resolve(process.cwd(), 'assets');

function clamp01(n) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function hexRgb(hex) {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) throw new Error(`Bad hex color: ${hex}`);
  const value = Number.parseInt(normalized, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function createImage(width, height, rgba = [0, 0, 0, 0]) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i + 0] = rgba[0];
    data[i + 1] = rgba[1];
    data[i + 2] = rgba[2];
    data[i + 3] = rgba[3];
  }
  return { width, height, data };
}

function blendPixel(img, x, y, rgba) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const idx = (y * img.width + x) * 4;

  const srcA = rgba[3] / 255;
  if (srcA <= 0) return;

  const dstA = img.data[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;

  const outR =
    (rgba[0] * srcA + img.data[idx + 0] * dstA * (1 - srcA)) / outA;
  const outG =
    (rgba[1] * srcA + img.data[idx + 1] * dstA * (1 - srcA)) / outA;
  const outB =
    (rgba[2] * srcA + img.data[idx + 2] * dstA * (1 - srcA)) / outA;

  img.data[idx + 0] = Math.round(outR);
  img.data[idx + 1] = Math.round(outG);
  img.data[idx + 2] = Math.round(outB);
  img.data[idx + 3] = Math.round(outA * 255);
}

function fillRadialGradient(img, innerRgb, outerRgb, cx, cy, radius) {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const t = clamp01(Math.sqrt(dx * dx + dy * dy) / radius);
      const r = Math.round(innerRgb[0] * (1 - t) + outerRgb[0] * t);
      const g = Math.round(innerRgb[1] * (1 - t) + outerRgb[1] * t);
      const b = Math.round(innerRgb[2] * (1 - t) + outerRgb[2] * t);
      const idx = (y * img.width + x) * 4;
      img.data[idx + 0] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = 255;
    }
  }
}

function drawSoftCircle(img, cx, cy, radius, rgb, alpha = 255) {
  const minX = Math.floor(cx - radius - 2);
  const maxX = Math.ceil(cx + radius + 2);
  const minY = Math.floor(cy - radius - 2);
  const maxY = Math.ceil(cy + radius + 2);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const edge = radius - d;
      if (edge <= -1) continue;
      const coverage = edge >= 1 ? 1 : clamp01(edge + 0.5);
      blendPixel(img, x, y, [rgb[0], rgb[1], rgb[2], Math.round(alpha * coverage)]);
    }
  }
}

function drawLineBrush(img, x0, y0, x1, y1, radius, rgb, alpha = 255) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    drawSoftCircle(img, x0 + dx * t, y0 + dy * t, radius, rgb, alpha);
  }
}

function drawPolyline(img, points, radius, rgb, alpha = 255) {
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    drawLineBrush(img, x0, y0, x1, y1, radius, rgb, alpha);
  }
}

function drawRect(img, x, y, w, h, rgb, alpha = 255) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(img.width, Math.ceil(x + w));
  const y1 = Math.min(img.height, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      blendPixel(img, xx, yy, [rgb[0], rgb[1], rgb[2], alpha]);
    }
  }
}

function drawTriangle(img, p0, p1, p2, rgb, alpha = 255) {
  const minX = Math.floor(Math.min(p0[0], p1[0], p2[0]));
  const maxX = Math.ceil(Math.max(p0[0], p1[0], p2[0]));
  const minY = Math.floor(Math.min(p0[1], p1[1], p2[1]));
  const maxY = Math.ceil(Math.max(p0[1], p1[1], p2[1]));

  const ax = p0[0],
    ay = p0[1];
  const bx = p1[0],
    by = p1[1];
  const cx = p2[0],
    cy = p2[1];

  const v0x = bx - ax,
    v0y = by - ay;
  const v1x = cx - ax,
    v1y = cy - ay;
  const denom = v0x * v1y - v0y * v1x;
  if (denom === 0) return;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const v2x = px - ax;
      const v2y = py - ay;
      const u = (v2x * v1y - v2y * v1x) / denom;
      const v = (v0x * v2y - v0y * v2x) / denom;
      if (u >= 0 && v >= 0 && u + v <= 1) {
        blendPixel(img, x, y, [rgb[0], rgb[1], rgb[2], alpha]);
      }
    }
  }
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let k = 0; k < 8; k++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function encodePng(img) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.width, 0);
  ihdr.writeUInt32BE(img.height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = img.width * 4;
  const raw = Buffer.alloc((stride + 1) * img.height);
  for (let y = 0; y < img.height; y++) {
    raw[y * (stride + 1)] = 0; // no filter
    raw.set(
      img.data.subarray(y * stride, y * stride + stride),
      y * (stride + 1) + 1,
    );
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawLogo(img, opts) {
  const {
    cx,
    cy,
    size,
    primaryRgb,
    accentRgb,
    shadow = true,
    onTransparent = false,
  } = opts;

  const stroke = Math.max(2, Math.round(size * 0.06));
  const shadowOffset = Math.round(stroke * 0.25);

  const points = [
    [cx - size * 0.36, cy + size * 0.12],
    [cx - size * 0.16, cy - size * 0.06],
    [cx + size * 0.02, cy + size * 0.04],
    [cx + size * 0.22, cy - size * 0.18],
    [cx + size * 0.38, cy - size * 0.08],
  ];

  if (shadow) {
    const shadowAlpha = onTransparent ? 120 : 90;
    drawPolyline(
      img,
      points.map(([x, y]) => [x + shadowOffset, y + shadowOffset]),
      stroke,
      [0, 0, 0],
      shadowAlpha,
    );
  }

  drawPolyline(img, points, stroke, primaryRgb, 255);

  const last = points[points.length - 1];
  const arrowSize = size * 0.12;
  drawTriangle(
    img,
    [last[0] + arrowSize * 0.65, last[1]],
    [last[0] - arrowSize * 0.35, last[1] - arrowSize * 0.55],
    [last[0] - arrowSize * 0.35, last[1] + arrowSize * 0.55],
    primaryRgb,
    255,
  );

  // "Alert" badge
  const badgeR = size * 0.12;
  const badgeCx = cx + size * 0.28;
  const badgeCy = cy - size * 0.26;
  drawSoftCircle(img, badgeCx, badgeCy, badgeR * 1.15, [255, 255, 255], 230);
  drawSoftCircle(img, badgeCx, badgeCy, badgeR, accentRgb, 255);
  drawSoftCircle(img, badgeCx + badgeR * 0.28, badgeCy - badgeR * 0.28, badgeR * 0.32, [255, 255, 255], 140);
}

async function generateIcon() {
  const img = createImage(1024, 1024, [0, 0, 0, 0]);

  const inner = hexRgb('#0f172a'); // slate-900
  const outer = hexRgb('#020617'); // slate-950
  fillRadialGradient(img, inner, outer, img.width * 0.5, img.height * 0.45, img.width * 0.9);

  // Subtle grid
  const gridRgb = hexRgb('#38bdf8'); // sky-400
  for (let x = 96; x < img.width; x += 128) drawRect(img, x, 0, 1, img.height, gridRgb, 18);
  for (let y = 128; y < img.height; y += 128) drawRect(img, 0, y, img.width, 1, gridRgb, 14);

  // Candlesticks (background)
  const candleUp = hexRgb('#34d399'); // emerald-400
  const candleDown = hexRgb('#fb7185'); // rose-400
  const baseY = img.height * 0.72;
  const candleW = 36;
  const gap = 54;
  const startX = img.width * 0.18;
  for (let i = 0; i < 9; i++) {
    const x = startX + i * gap;
    const up = i % 3 !== 1;
    const h = 120 + (i % 4) * 32;
    const rgb = up ? candleUp : candleDown;
    drawRect(img, x - 1, baseY - h - 24, 2, h + 48, rgb, 80); // wick
    drawRect(img, x - candleW / 2, baseY - h, candleW, h * 0.65, rgb, 70); // body
  }

  // Main logo
  drawLogo(img, {
    cx: img.width * 0.5,
    cy: img.height * 0.55,
    size: img.width * 0.62,
    primaryRgb: hexRgb('#22c55e'),
    accentRgb: hexRgb('#f43f5e'),
    shadow: true,
  });

  return img;
}

async function generateAdaptiveIcon() {
  const img = createImage(1024, 1024, [0, 0, 0, 0]);
  drawLogo(img, {
    cx: img.width * 0.5,
    cy: img.height * 0.55,
    size: img.width * 0.70,
    primaryRgb: hexRgb('#22c55e'),
    accentRgb: hexRgb('#f43f5e'),
    shadow: true,
    onTransparent: true,
  });
  return img;
}

async function generateSplashIcon() {
  const img = createImage(1024, 1024, [255, 255, 255, 255]);
  const ringRgb = hexRgb('#0f172a');
  drawSoftCircle(img, img.width * 0.5, img.height * 0.5, img.width * 0.40, ringRgb, 20);
  drawLogo(img, {
    cx: img.width * 0.5,
    cy: img.height * 0.52,
    size: img.width * 0.62,
    primaryRgb: hexRgb('#16a34a'),
    accentRgb: hexRgb('#e11d48'),
    shadow: true,
  });
  return img;
}

async function generateFavicon() {
  const img = createImage(48, 48, [255, 255, 255, 255]);
  drawSoftCircle(img, img.width * 0.5, img.height * 0.5, img.width * 0.48, hexRgb('#0f172a'), 255);
  drawLogo(img, {
    cx: img.width * 0.5,
    cy: img.height * 0.55,
    size: img.width * 0.95,
    primaryRgb: hexRgb('#22c55e'),
    accentRgb: hexRgb('#f43f5e'),
    shadow: false,
  });
  return img;
}

async function writePng(name, img) {
  const outPath = path.join(ASSETS_DIR, name);
  const png = encodePng(img);
  await fs.writeFile(outPath, png);
  return outPath;
}

async function main() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  const written = [];

  written.push(await writePng('icon.png', await generateIcon()));
  written.push(await writePng('adaptive-icon.png', await generateAdaptiveIcon()));
  written.push(await writePng('splash-icon.png', await generateSplashIcon()));
  written.push(await writePng('favicon.png', await generateFavicon()));

  // eslint-disable-next-line no-console
  console.log(`Generated ${written.length} assets:\n- ${written.join('\n- ')}`);
}

await main();
