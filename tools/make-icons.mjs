// Genera icons/icon-192.png e icons/icon-512.png sin dependencias externas,
// usando solo el zlib que trae Node. Ejecutar una vez: node tools/make-icons.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'icons');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // sin filtro
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function setPixel(rgba, width, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= width) return;
  const i = (y * width + x) * 4;
  rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
}

// Dibuja una mancuerna simple: barra horizontal + dos discos en cada extremo,
// en blanco sobre fondo azul sólido, centrada y dentro de zona segura maskable (~80%).
function drawDumbbell(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const bg = [37, 99, 235, 255]; // azul, coherente con --primary
  const fg = [255, 255, 255, 255];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) setPixel(rgba, size, x, y, bg);
  }

  const cx = size / 2;
  const cy = size / 2;
  const barHalfLen = size * 0.28;
  const barHalfWidth = size * 0.045;
  const discR = size * 0.16;
  const discOffset = barHalfLen + discR * 0.35;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;

      const inBar = Math.abs(dx) <= barHalfLen && Math.abs(dy) <= barHalfWidth;
      const distLeftDisc = Math.hypot(dx + discOffset, dy);
      const distRightDisc = Math.hypot(dx - discOffset, dy);
      const inDisc = distLeftDisc <= discR || distRightDisc <= discR;

      if (inBar || inDisc) setPixel(rgba, size, x, y, fg);
    }
  }

  return rgba;
}

function writeIcon(size, filename) {
  const rgba = drawDumbbell(size);
  const png = encodePNG(size, size, rgba);
  writeFileSync(path.join(outDir, filename), png);
  console.log(`Generado ${filename} (${size}x${size})`);
}

writeIcon(192, 'icon-192.png');
writeIcon(512, 'icon-512.png');
