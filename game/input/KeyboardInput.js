const MAP = {
  KeyW: 'throttle', ArrowUp: 'throttle', KeyS: 'brake', ArrowDown: 'brake',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'drift', KeyE: 'item', KeyR: 'recover',
};

export class KeyboardInput {
  constructor(input) {
    this.input = input; this.held = new Set();
    addEventListener('keydown', event => this.set(event, true));
    addEventListener('keyup', event => this.set(event, false));
    addEventListener('blur', () => this.held.clear());
    addEventListener('visibilitychange', () => { if (document.hidden) this.held.clear(); });
  }
  set(event, down) {
    const action = MAP[event.code]; if (!action) return;
    event.preventDefault();
    if (down && !event.repeat && (action === 'item' || action === 'recover')) this.input.pulse(action);
    if (down) this.held.add(action); else this.held.delete(action);
  }
  update() {
    const h = this.held;
    this.input.throttle = h.has('throttle') ? 1 : 0;
    this.input.brake = h.has('brake') ? 1 : 0;
    this.input.steer = (h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0);
    this.input.drift = h.has('drift');
  }
}
