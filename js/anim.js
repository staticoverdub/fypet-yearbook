// Idle animation like the device's Animator (core/anim.cpp): blinks every 3-7 s, a 1 px breathing squash every
// 1.5 s, slow breathing with closed eyes when asleep. Visual only; no parity needed.
export class Animator {
  constructor(seed = 1, fidget = 0) {
    this.s = seed >>> 0 || 1;
    this.fidget = fidget;
    this.nextBlink = 0;
    this.blinkUntil = 0;
    this.hopUntil = 0;
  }
  rand(n) {  // small LCG; the look matters, not the numbers
    this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0;
    return this.s % n;
  }
  hop(now) { this.hopStart = now; this.hopUntil = now + 350; }
  frame(now, spriteHeight, asleep = false) {
    const f = { eyesClosed: false, dropRow: -1, yOffset: 0 };
    if (!this.nextBlink) this.nextBlink = now + 3000 + this.rand(4000);
    if (now >= this.nextBlink) {
      this.blinkUntil = now + 150;
      this.nextBlink = now + 3000 + this.rand(4000) - this.fidget * 150;
    }
    f.eyesClosed = asleep || now < this.blinkUntil;
    const mid = 29 - Math.trunc(spriteHeight / 2);
    if (asleep) { if (now % 3000 < 400) f.dropRow = mid; return f; }
    if (now % 1500 < 200) f.dropRow = mid;
    if (now < this.hopUntil) {
      const t = (now - this.hopStart) % 350;
      f.yOffset = t < 175 ? -Math.trunc(t / 44) : -Math.trunc((350 - t) / 44);
    }
    return f;
  }
}

// Runs fn(now) on animation frames at ~20 fps (the device's rate), pausing while the tab is hidden.
export function loop(fn) {
  let last = 0;
  const tick = (t) => {
    if (t - last >= 50) { last = t; fn(t); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
