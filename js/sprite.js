// Procedural creature sprites (SPEC 6.2, DECISIONS D-050..D-058).
// PARITY CONTRACT with src/core/sprite_gen.cpp: keep the two line-for-line equivalent.
import { mulberry32 } from "./prng.js";
import {
  TEMPLATES, EYE_SMALL, EYE_LARGE, CRESTS, TAILS, CREATURE_PALETTES, SHINY_PALETTES, ELDER_DESAT, EYE_WHITE,
  kLimbArm, kLimbNub, kLimbFoot, kLimbTentacle, kEyeClosedSmall, kEyeClosedLarge,
} from "./creature_data.js";

export const SPRITE_SIZE = 32;
export const STAGES = ["egg", "hatchling", "juvenile", "adult", "elder"];
const N = SPRITE_SIZE;
const idiv = (a, b) => Math.trunc(a / b);

export function stageHeight(g, stage) {
  const adult = 18 + 2 * (g.bodySize & 3);
  switch (stage) {
    case "hatchling": return Math.max(12, adult - 6);
    case "juvenile": return adult - 2;
    case "adult":
    case "elder": return adult;
    default: return 0;
  }
}

function stamp(px, s, x0, y0, mirror) {
  for (let j = 0; j < s.h; j++)
    for (let i = 0; i < s.w; i++) {
      const v = s.px[j * s.w + (mirror ? s.w - 1 - i : i)];
      const x = x0 + i, y = y0 + j;
      if (v && x >= 0 && x < N && y >= 0 && y < N) px[y * N + x] = v;
    }
}

function rowExtreme(px, y, leftmost, fallback) {
  if (y < 0 || y >= N) return fallback;
  if (leftmost) { for (let x = 0; x < N; x++) if (px[y * N + x]) return x; }
  else { for (let x = N - 1; x >= 0; x--) if (px[y * N + x]) return x; }
  return fallback;
}

// Returns { px: Uint8Array(1024), headTop, eyeLine, handL, handR, feet, height } or null (egg).
export function generateSprite(g, stage, eyesClosed = false) {
  const H = stageHeight(g, stage);
  if (!H) return null;
  const W = idiv(H, 2);
  const tpl = TEMPLATES[g.bodyTemplate & 7].cells;
  const next = mulberry32(g.detailSeed);
  const range = (n) => next() % n;

  // 1-2
  const half = [], maybe = [];
  for (let y = 0; y < H; y++) {
    half.push(new Uint8Array(W)); maybe.push(new Uint8Array(W));
    for (let x = 0; x < W; x++) {
      const t = tpl[idiv(y * 24, H) * 12 + idiv(x * 12, W)];
      maybe[y][x] = t === 2 ? 1 : 0;
      half[y][x] = t === 1 ? 1 : (t === 2 ? (range(2) === 1 ? 1 : 0) : 0);
    }
  }
  // 3
  for (let pass = 0; pass < 2; pass++) {
    const prev = half.map((r) => r.slice());
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!maybe[y][x]) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            let nx = x + dx; const ny = y + dy;
            if (nx === W) nx = W - 1;
            if (nx < 0 || ny < 0 || ny >= H) continue;
            n += prev[ny][nx];
          }
        half[y][x] = n >= 4 ? 1 : 0;
      }
  }
  // 4
  const full = [];
  for (let y = 0; y < H; y++) {
    full.push(new Uint8Array(2 * W));
    for (let x = 0; x < W; x++) if (half[y][x]) full[y][x] = full[y][2 * W - 1 - x] = 3;
  }
  // 5
  {
    let sy = -1, sx = -1;
    for (let y = H - 1; y >= 0 && sy < 0; y--)
      for (let x = W - 1; x >= 0; x--) if (full[y][x]) { sy = y; sx = x; break; }
    const keep = full.map((r) => new Uint8Array(r.length));
    if (sy >= 0) {
      const stack = [[sx, sy]];
      keep[sy][sx] = 1;
      while (stack.length) {
        const [x, y] = stack.pop();
        for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + ddx, ny = y + ddy;
          if (nx < 0 || ny < 0 || nx >= 2 * W || ny >= H || keep[ny][nx] || !full[ny][nx]) continue;
          keep[ny][nx] = 1;
          stack.push([nx, ny]);
        }
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < 2 * W; x++) if (!keep[y][x]) full[y][x] = 0;
  }
  // 6
  switch (g.pattern & 3) {
    case 1: {
      const cy = idiv(H * 2, 3), rx = 2 * idiv(W, 2), ry = 2 * idiv(H, 4);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < 2 * W; x++) {
          const dx = 2 * x + 1 - 2 * W, dy = 2 * y + 1 - 2 * cy;
          if (full[y][x] === 3 && dx * dx * ry * ry + dy * dy * rx * rx <= rx * rx * ry * ry) full[y][x] = 2;
        }
      break;
    }
    case 2: {
      const count = 3 + range(3);
      for (let i = 0; i < count; i++) {
        const sx = range(W), sy = range(H);
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++) {
            const hx = sx + dx, hy = sy + dy;
            if (hx >= W || hy >= H) continue;
            if (full[hy][hx] === 3) full[hy][hx] = 2;
            if (full[hy][2 * W - 1 - hx] === 3) full[hy][2 * W - 1 - hx] = 2;
          }
      }
      break;
    }
    case 3:
      for (let y = idiv(H, 3); y < H; y += 3) for (let x = 0; x < 2 * W; x++) if (full[y][x] === 3) full[y][x] = 2;
      break;
  }
  // 7
  for (let x = 0; x < 2 * W; x++) {
    let shaded = 0;
    for (let y = H - 1; y >= 0 && shaded < 2; y--) if (full[y][x]) { full[y][x] = 2; shaded++; }
    if (x < idiv(2 * W * 2, 3)) for (let y = 0; y < H; y++) if (full[y][x]) { full[y][x] = 4; break; }
  }
  // 7b
  if (stage === "elder") {
    let t = -1;
    for (let y = 0; y < H && t < 0; y++) for (let x = 0; x < 2 * W; x++) if (full[y][x]) { t = y; break; }
    if (t >= 0 && t + 2 < H) {
      full[t + 2] = full[t + 1].slice();
      full[t + 1] = full[t].slice();
      full[t] = new Uint8Array(2 * W);
    }
  }
  // 8
  const px = new Uint8Array(N * N);
  const x0 = 15 - W, y0 = 28 - H;
  for (let y = 0; y < H; y++) for (let x = 0; x < 2 * W; x++) px[(y0 + 1 + y) * N + (x0 + 1 + x)] = full[y][x];
  {
    const before = px.slice();
    for (let y = y0; y <= y0 + H + 1; y++)
      for (let x = x0; x <= x0 + 2 * W + 1; x++) {
        if (before[y * N + x]) continue;
        const adj = (x > 0 && before[y * N + x - 1]) || (x < N - 1 && before[y * N + x + 1]) ||
          (y > 0 && before[(y - 1) * N + x]) || (y < N - 1 && before[(y + 1) * N + x]);
        if (adj) px[y * N + x] = 1;
      }
  }
  // 9
  let headY = -1;
  for (let y = 0; y < N && headY < 0; y++) { const v = px[y * N + 16]; if (v >= 2 && v <= 4) headY = y; }
  if (headY < 0)
    for (let y = 0; y < N && headY < 0; y++)
      for (let x = 0; x < N; x++) if (px[y * N + x] >= 2 && px[y * N + x] <= 4) { headY = y; break; }
  const bodyH = (y0 + H) - headY + 1;
  const eyeY = headY + idiv(bodyH * 35, 100);
  const armY = headY + idiv(bodyH * 55, 100);
  const tailY = headY + idiv(bodyH * 70, 100);
  const handL = rowExtreme(px, armY, true, x0);
  const handR = rowExtreme(px, armY, false, x0 + 2 * W + 1);
  const tailX = rowExtreme(px, tailY, false, x0 + 2 * W + 1);

  const limbs = g.limbs & 3;
  if (limbs === 1 || limbs === 2) {
    const a = kLimbArm;
    stamp(px, a, handL - a.w + 1, armY - idiv(a.h, 2), false);
    stamp(px, a, handR, armY - idiv(a.h, 2), true);
  }
  if (limbs !== 1) {
    const f = limbs === 0 ? kLimbNub : limbs === 2 ? kLimbFoot : kLimbTentacle;
    stamp(px, f, 16 - idiv(W, 2) - f.w, 29, false);
    stamp(px, f, 16 + idiv(W, 2), 29, true);
  }
  const tail = TAILS[g.tail & 3];
  if (tail.w) stamp(px, tail, tailX, tailY - idiv(tail.h, 2), false);
  const crest = CRESTS[g.crest & 7];
  if (crest.w) stamp(px, crest, 16 - idiv(crest.w, 2), headY - crest.h + 1, false);
  const eye = eyesClosed ? (stage === "hatchling" ? kEyeClosedLarge : kEyeClosedSmall)
    : (stage === "hatchling" ? EYE_LARGE[g.eyes & 7] : EYE_SMALL[g.eyes & 7]);
  const es = Math.max(1, idiv(TEMPLATES[g.bodyTemplate & 7].eyeOffset * W, 12));
  stamp(px, eye, 16 - es - eye.w, eyeY - idiv(eye.h, 2), false);
  stamp(px, eye, 16 + es, eyeY - idiv(eye.h, 2), true);

  let lowest = 0;
  for (let y = N - 1; y >= 0 && !lowest; y--) for (let x = 0; x < N; x++) if (px[y * N + x]) { lowest = y; break; }
  return {
    px, height: H,
    headTop: { x: 16, y: headY }, eyeLine: { x: 16, y: eyeY },
    handL: { x: handL, y: armY }, handR: { x: handR, y: armY }, feet: { x: 16, y: lowest + 1 },
  };
}

// Buffer value -> master palette index (index 0 transparent).
export function spritePalette(g, stage) {
  const p = (g.shiny ? SHINY_PALETTES : CREATURE_PALETTES)[g.palette & 31];
  const slots = p.map((v) => (stage === "elder" ? ELDER_DESAT[v] : v));
  return [0, ...slots, EYE_WHITE];
}

export function spriteHash(px) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < px.length; i++) {
    h ^= px[i];
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
