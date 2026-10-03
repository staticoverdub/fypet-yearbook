// Canvas rendering of procedural creatures (SPEC 12.4): the same sprite buffer and palette the device draws,
// mapped through the master palette (js/palette.js), so a creature looks identical on the site and the screen.
import { PALETTE_HEX } from "./palette.js";
import { generateSprite, spritePalette, SPRITE_SIZE } from "./sprite.js";

const N = SPRITE_SIZE;
const RGB = PALETTE_HEX.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

// RGBA pixels (N*N*4) for a sprite through its 6-entry palette. opts: { dropRow, lowerRows, flip }.
// dropRow mirrors the device's squash: that row is skipped and the rows above shift down one (core/renderer.cpp).
export function spriteRGBA(sprite, pal, opts = {}) {
  const out = new Uint8ClampedArray(N * N * 4);
  const drop = opts.dropRow ?? -1, lower = opts.lowerRows ?? 0;
  for (let y = 0; y < N; y++) {
    if (y === drop) continue;
    const dy = y + lower + (drop >= 0 && y < drop ? 1 : 0);
    if (dy < 0 || dy >= N) continue;
    for (let x = 0; x < N; x++) {
      const v = sprite.px[y * N + (opts.flip ? N - 1 - x : x)];
      if (!v || v > 5) continue;
      const c = RGB[pal[v]];
      const o = (dy * N + x) * 4;
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
    }
  }
  return out;
}

// A creature for a genome + stage, ready to draw: both eye states and the palette.
export function makeCreature(genome, stage) {
  const st = stage === "egg" || stage === "deceased" ? "adult" : stage;
  return {
    stage: st,
    open: generateSprite(genome, st, false),
    closed: generateSprite(genome, st, true),
    pal: spritePalette(genome, st),
  };
}

// Draws one frame at integer scale with its top-left at (x, y) in canvas pixels.
export function drawCreature(ctx, creature, frame, x, y, scale) {
  const sprite = frame.eyesClosed ? creature.closed : creature.open;
  const img = new ImageData(spriteRGBA(sprite, creature.pal, frame), N, N);
  const tmp = drawCreature.tmp || (drawCreature.tmp = document.createElement("canvas"));
  tmp.width = N; tmp.height = N;
  tmp.getContext("2d").putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, N, N, x, y + (frame.yOffset || 0) * scale, N * scale, N * scale);
}

// A simple egg (the device uses a tinted PixelLab strip; the site draws it from the body palette).
export function drawEgg(ctx, genome, x, y, scale, wobble = 0) {
  const pal = spritePalette(genome, "adult");
  const W = 14, H = 18;
  for (let j = 0; j < H; j++) {
    const t = (j - H * 0.55) / (H * 0.55);
    const half = Math.round((W / 2) * Math.sqrt(Math.max(0, 1 - t * t)) * (j < H * 0.4 ? 0.85 + 0.15 * (j / (H * 0.4)) : 1));
    for (let i = -half; i < half; i++) {
      const edge = i === -half || i === half - 1 || j === 0 || j === H - 1;
      const spot = ((i * 7 + j * 13) & 15) === 0;
      const idx = edge ? pal[1] : spot ? pal[4] : i < -half / 3 ? pal[4] : pal[3];
      ctx.fillStyle = PALETTE_HEX[idx];
      ctx.fillRect(x + (16 + i + wobble) * scale, y + (30 - H + j) * scale, scale, scale);
    }
  }
}
