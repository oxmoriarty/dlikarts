export class InputState {
  constructor() { this.clear(); this.pressed = new Set(); }
  clear() { this.throttle = 0; this.brake = 0; this.steer = 0; this.drift = false; this.useItem = false; this.recover = false; }
  pulse(action) { this.pressed.add(action); }
  consume(action) { const found = this.pressed.has(action); this.pressed.delete(action); return found; }
}
