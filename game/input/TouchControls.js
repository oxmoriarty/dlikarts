export class TouchControls {
  constructor(input) {
    this.input = input; this.held = new Set();
    document.querySelectorAll('[data-touch]').forEach(button => {
      const action = button.dataset.touch;
      const down = event => { event.preventDefault(); button.setPointerCapture?.(event.pointerId); if (action === 'item' || action === 'recover') this.input.pulse(action); else this.held.add(action); button.classList.add('pressed'); };
      const up = event => { event.preventDefault(); this.held.delete(action); button.classList.remove('pressed'); };
      button.addEventListener('pointerdown', down); button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up); button.addEventListener('pointerleave', event => { if (event.buttons === 0) up(event); });
    });
    addEventListener('visibilitychange', () => { if (document.hidden) this.held.clear(); });
  }
  update() {
    const h = this.held; const touchLayout = matchMedia('(pointer: coarse)').matches || innerWidth <= 760;
    if (!touchLayout) return;
    // Touch driving intentionally mirrors keyboard driving: acceleration is
    // held by the player, while BRAKE first stops and then reverses the kart.
    this.input.throttle = h.has('accelerate') ? 1 : 0;
    this.input.brake = h.has('brake') ? 1 : 0;
    this.input.steer = (h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0);
    this.input.drift = h.has('drift');
  }
}
