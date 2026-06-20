// Headless preview: run a built wallpaper for a couple of seconds under
// DOM/canvas stubs, capture the final frame's draw calls, rasterize them in
// pure JS, and write a PNG. No browser, no native deps.
//
//   node tools/preview.mjs <mode> [outfile] [scale]
//   e.g. node tools/preview.mjs art-nouveau preview/art-nouveau.png 0.5
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'art-nouveau';
const out = process.argv[3] || join(ROOT, 'preview', mode + '.png');
const S = parseFloat(process.argv[4] || '0.5');
const W = 1920, H = 1080, PW = Math.round(W * S), PH = Math.round(H * S);

const html = readFileSync(join(ROOT, 'build', mode, 'index.html'), 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];

// ---- capture draw calls for one frame ----
let records = [], bg = '#000', cur = [];
const state = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1 };
const ctx = new Proxy({}, {
  get(_, p) {
    if (p === 'beginPath') return () => { cur = []; };
    if (p === 'moveTo' || p === 'lineTo') return (x, y) => cur.push([x * S, y * S]);
    if (p === 'fillRect') return () => { bg = state.fillStyle; };
    if (p === 'fill') return () => records.push({ t: 'f', pts: cur.slice(), s: state.fillStyle });
    if (p === 'stroke') return () => records.push({ t: 's', pts: cur.slice(), s: state.strokeStyle });
    return () => {};
  },
  set(_, p, v) { state[p] = v; return true; }
});
const canvas = { width: W, height: H, style: {}, parentNode: null, getContext: () => ctx, remove() {} };
const q = [];
const sb = {
  document: { createElement: () => canvas, querySelector: () => ({ appendChild() {} }), body: { appendChild() {} } },
  requestAnimationFrame: (cb) => { q.push(cb); return q.length; }, cancelAnimationFrame: () => {},
  Math, Map, Set, Object, Array, console, Date
};
sb.window = sb; sb.window.innerWidth = W; sb.window.innerHeight = H;
sb.window.addEventListener = () => {}; sb.window.removeEventListener = () => {};
vm.createContext(sb); vm.runInContext(js, sb);
let t = 0;
for (let i = 0; i < 60; i++) { const cb = q.shift(); if (!cb) break; if (i === 59) records = []; cb(t += 33); }

// ---- color ----
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
function parse(c) {
  if (c[0] === '#') { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const m = c.match(/hsl\(([-\d.]+),\s*([-\d.]+)%,\s*([-\d.]+)%\)/);
  if (m) return hslToRgb((parseFloat(m[1]) % 360 + 360) % 360, +m[2], +m[3]);
  return [128, 128, 128];
}

// ---- rasterize ----
const buf = Buffer.alloc(PW * PH * 3);
const bgc = parse(bg);
for (let i = 0; i < PW * PH; i++) { buf[i * 3] = bgc[0]; buf[i * 3 + 1] = bgc[1]; buf[i * 3 + 2] = bgc[2]; }
const px = (x, y, c) => { if (x < 0 || y < 0 || x >= PW || y >= PH) return; const o = (y * PW + x) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; };
function fillPoly(pts, c) {
  for (const p of pts) if (!isFinite(p[0]) || !isFinite(p[1])) return;
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let y = Math.max(0, Math.ceil(minY)); y <= Math.min(PH - 1, Math.floor(maxY)); y++) {
    const xs = [];
    for (let i = 0, n = pts.length; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((u, v) => u - v);
    for (let i = 0; i + 1 < xs.length; i += 2)
      for (let x = Math.max(0, Math.ceil(xs[i])); x <= Math.min(PW - 1, Math.floor(xs[i + 1])); x++) px(x, y, c);
  }
}
function line(a, b, c) {
  if (!isFinite(a[0]) || !isFinite(a[1]) || !isFinite(b[0]) || !isFinite(b[1])) return;
  let x0 = Math.round(a[0]), y0 = Math.round(a[1]), x1 = Math.round(b[0]), y1 = Math.round(b[1]);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, guard = 10 * (PW + PH); // hard cap: never loop forever
  for (;;) { px(x0, y0, c); if ((x0 === x1 && y0 === y1) || --guard < 0) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
for (const rec of records) {
  const c = parse(rec.s);
  if (rec.t === 'f') fillPoly(rec.pts, c);
  else for (let i = 0; i + 1 < rec.pts.length; i++) line(rec.pts[i], rec.pts[i + 1], c);
}

// ---- encode PNG (RGB, filter 0 per row) ----
function crc32(b) {
  let c = ~0;
  for (let i = 0; i < b.length; i++) { c ^= b[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const raw = Buffer.alloc(PH * (1 + PW * 3));
for (let y = 0; y < PH; y++) { raw[y * (1 + PW * 3)] = 0; buf.copy(raw, y * (1 + PW * 3) + 1, y * PW * 3, (y + 1) * PW * 3); }
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(PW, 0); ihdr.writeUInt32BE(PH, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
]);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`${mode}: ${records.length} shapes -> ${out} (${PW}x${PH})`);
