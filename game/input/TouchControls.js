export class TouchControls {
  constructor(input) {
    this.input = input; this.held = new Set(); this.screenSteerPointers = new Map();
    this.controlMode = this.loadControlMode();
    document.body.dataset.touchSteering = this.controlMode;
    document.querySelectorAll('[data-touch]').forEach(button => {
      const action = button.dataset.touch;
      const down = event => { event.preventDefault(); button.setPointerCapture?.(event.pointerId); if (action === 'item' || action === 'recover') this.input.pulse(action); else this.held.add(action); button.classList.add('pressed'); };
      const up = event => { event.preventDefault(); this.held.delete(action); button.classList.remove('pressed'); };
      button.addEventListener('pointerdown', down); button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up); button.addEventListener('pointerleave', event => { if (event.buttons === 0) up(event); });
    });
    const canvas = document.querySelector('#game');
    const setScreenSteer = (event, active) => {
      if (this.controlMode !== 'screen' || !this.isTouchLayout() || event.pointerType === 'mouse') return;
      event.preventDefault();
      if (active) { this.screenSteerPointers.set(event.pointerId, event.clientX < innerWidth / 2 ? 'left' : 'right'); canvas.setPointerCapture?.(event.pointerId); }
      else this.screenSteerPointers.delete(event.pointerId);
    };
    canvas.addEventListener('pointerdown', event => setScreenSteer(event, true));
    canvas.addEventListener('pointerup', event => setScreenSteer(event, false));
    canvas.addEventListener('pointercancel', event => setScreenSteer(event, false));
    addEventListener('visibilitychange', () => { if (document.hidden) { this.held.clear(); this.screenSteerPointers.clear(); } });
  }
  loadControlMode() { try { return localStorage.getItem('dlikarts.controls') === 'screen' ? 'screen' : 'buttons'; } catch { return 'buttons'; } }
  setControlMode(mode) {
    this.controlMode = mode === 'screen' ? 'screen' : 'buttons';
    this.held.clear(); this.screenSteerPointers.clear();
    document.body.dataset.touchSteering = this.controlMode;
    try { localStorage.setItem('dlikarts.controls', this.controlMode); } catch { /* Storage may be unavailable. */ }
  }
  isTouchLayout() { return matchMedia('(pointer: coarse)').matches || innerWidth <= 760; }
  update() {
    const h = this.held; const touchLayout = this.isTouchLayout();
    if (!touchLayout) return;
    // Touch driving intentionally mirrors keyboard driving: acceleration is
    // held by the player, while BRAKE first stops and then reverses the kart.
    // Side-touch steering deliberately keeps the racing surface unobstructed:
    // the kart drives forward automatically and each half of the screen only
    // steers. The held pickup remains the sole visible touch action.
    this.input.throttle = this.controlMode === 'screen' ? 1 : (h.has('accelerate') ? 1 : 0);
    this.input.brake = this.controlMode === 'screen' ? 0 : (h.has('brake') ? 1 : 0);
    const screenSteer = [...this.screenSteerPointers.values()];
    this.input.steer = this.controlMode === 'screen' ? ((screenSteer.includes('right') ? 1 : 0) - (screenSteer.includes('left') ? 1 : 0)) : ((h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0));
    this.input.drift = this.controlMode === 'screen' ? false : h.has('drift');
  }
}
