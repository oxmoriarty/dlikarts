import { STEP, MAX_STEPS } from '../config/game-config.js';

export class FixedStepLoop {
  constructor({ update, render }) {
    this.update = update;
    this.render = render;
    this.running = false;
    this.last = 0;
    this.accumulator = 0;
    this.frame = this.frame.bind(this);
  }
  start() { this.running = true; this.last = performance.now() / 1000; requestAnimationFrame(this.frame); }
  stop() { this.running = false; }
  frame(nowMs) {
    if (!this.running) return;
    const now = nowMs / 1000;
    this.accumulator += Math.min(now - this.last, 0.1);
    this.last = now;
    let steps = 0;
    while (this.accumulator >= STEP && steps < MAX_STEPS) {
      this.update(STEP);
      this.accumulator -= STEP;
      steps += 1;
    }
    if (steps === MAX_STEPS) this.accumulator = 0;
    this.render(this.accumulator / STEP);
    requestAnimationFrame(this.frame);
  }
}
