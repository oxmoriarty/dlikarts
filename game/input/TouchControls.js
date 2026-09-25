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
    const h = this.held; const coarse = matchMedia('(pointer: coarse)').matches;
    if (!coarse) return;
    this.input.throttle = 1; this.input.brake = h.has('brake') ? 1 : 0; this.input.steer = (h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0); this.input.drift = h.has('drift') || (h.has('brake') && this.input.throttle > 0);
  }
}
