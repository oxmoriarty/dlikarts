import * as THREE from 'three';

export class RacingLineAI {
  constructor(racer, track, seed) { this.racer = racer; this.track = track; this.seed = seed; this.offset = (seed - 2.5) * .28; this.timer = 0; this.actions = { throttle: 1, brake: 0, steer: 0, drift: false, useItem: false, recover: false }; }
  update(dt) {
    const kart = this.racer.kart; this.timer -= dt;
    const look = .022 + Math.min(.045, Math.abs(kart.speed) / 500); const target = this.track.sampleAt((kart.progress + look) % 1);
    const desired = target.p.clone().addScaledVector(target.normal, this.offset); const forward = kart.forward(new THREE.Vector3()); const to = desired.sub(kart.position).setY(0).normalize();
    // The player-facing controller inverts positive-Y yaw for the chase-camera
    // convention, so AI converts its geometric signed angle into that input.
    const cross = forward.z * to.x - forward.x * to.z; const dot = THREE.MathUtils.clamp(forward.dot(to), -1, 1); const angle = Math.atan2(cross, dot);
    const next = this.track.sampleAt((kart.progress + .055) % 1), after = this.track.sampleAt((kart.progress + .10) % 1);
    const curve = 1 - THREE.MathUtils.clamp(next.tangent.dot(after.tangent), .72, 1); const targetSpeed = 16.5 - curve * 16 - Math.abs(angle) * 3 - this.seed * .12;
    this.actions.steer = THREE.MathUtils.clamp(-angle * 1.55, -1, 1); this.actions.throttle = kart.speed < targetSpeed ? 1 : .18; this.actions.brake = kart.speed > targetSpeed + 2 ? .55 : 0;
    this.actions.drift = Math.abs(angle) > .23 && kart.speed > 8 && !kart.offRoad; this.actions.recover = !this.track.query(kart.position, kart.progress).inBounds;
    // Items live on the kart, so every CPU racer can collect and use the same
    // power-ups as Guatam. Rattle Pod's projectile system excludes only its
    // owner, allowing it to hit any other active racer.
    if (kart.item && this.timer <= 0) { this.actions.useItem = true; this.timer = 1.5 + this.seed * .18; } else this.actions.useItem = false;
    return this.actions;
  }
}
