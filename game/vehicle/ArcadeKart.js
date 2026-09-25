import * as THREE from 'three';
import { canStartDrift, driftTier } from './driftMath.js';

const clamp = THREE.MathUtils.clamp;

export class ArcadeKart {
  constructor(id, tuning, pose) {
    this.id = id; this.tuning = tuning; this.position = pose.position.clone(); this.previousPosition = pose.position.clone();
    // The fallback keeps hot-reloaded/local builds stable if an older cached
    // tuning module is momentarily paired with the current controller.
    this.wheelGroundOffset = Number.isFinite(tuning.wheelGroundOffset) ? tuning.wheelGroundOffset : 0;
    this.yaw = pose.yaw; this.previousYaw = pose.yaw; this.progress = pose.progress; this.speed = 0; this.lateralSpeed = 0; this.verticalSpeed = 0;
    this.grounded = true; this.drift = false; this.driftDirection = 0; this.driftCharge = 0; this.boostTimer = 0; this.boostStrength = 0;
    this.airborne = false; this.jumpUsed = false; this.offRoad = false; this.hitTimer = 0; this.guardTimer = 0; this.item = null; this.finished = false;
    this.lean = 0; this.pitch = 0; this.recoveryTimer = 0; this.lastSafe = pose.position.clone(); this.lastSafeYaw = pose.yaw;
  }
  forward(out = new THREE.Vector3()) { return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  right(out = new THREE.Vector3()) { return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }
  giveBoost(tier) { if (!tier) return; this.boostTimer = tier.duration; this.boostStrength = tier.strength; }
  releaseDrift() { const tier = driftTier(this.driftCharge, this.tuning.driftTiers); this.giveBoost(tier); this.drift = false; this.driftCharge = 0; return tier; }
  reset() { this.position.copy(this.lastSafe); this.previousPosition.copy(this.lastSafe); this.yaw = this.previousYaw = this.lastSafeYaw; this.speed = 0; this.lateralSpeed = 0; this.verticalSpeed = 0; this.airborne = false; this.drift = false; this.driftCharge = 0; this.boostTimer = 0; }
  update(dt, input, track, enabled = true) {
    this.previousPosition.copy(this.position); this.previousYaw = this.yaw; this.hitTimer = Math.max(0, this.hitTimer - dt); this.guardTimer = Math.max(0, this.guardTimer - dt);
    const qBefore = track.query(this.position, this.progress); this.progress = qBefore.t; this.offRoad = !qBefore.onRoad;
    const groundY = qBefore.p.y + track.roadSurfaceOffset + this.wheelGroundOffset;
    // Countdown/ready karts must use the same physical ground contact as
    // active karts; previously this early return retained the old .35 m grid
    // height and made every kart visibly hover before the green light.
    if (!enabled || this.finished) { this.speed = Math.max(0, this.speed - this.tuning.brakeDeceleration * dt); this.position.y = groundY; return; }
    if (input.recover) { this.reset(); return; }
    const forwardInput = input.throttle || 0, brake = input.brake || 0, steer = input.steer || 0;
    const boost = this.boostTimer > 0; if (boost) this.boostTimer -= dt;
    const maxSpeed = this.offRoad ? this.tuning.offRoadMaxSpeed : this.tuning.maxSpeed;
    if (forwardInput > 0) this.speed += this.tuning.acceleration * forwardInput * dt;
    if (boost) this.speed += this.tuning.boostAcceleration * dt;
    if (brake > 0) {
      if (this.speed > .5) this.speed -= this.tuning.brakeDeceleration * brake * dt;
      else this.speed -= this.tuning.reverseAcceleration * brake * dt;
    }
    const drag = this.offRoad ? this.tuning.offRoadDrag : this.tuning.rollingDrag;
    this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), drag * dt);
    this.speed = clamp(this.speed, -this.tuning.reverseMaxSpeed, maxSpeed + (boost ? this.boostStrength : 0));
    if (!this.airborne && !this.drift && input.drift && canStartDrift({ speed: Math.abs(this.speed), steer, grounded: true, tuning: this.tuning })) { this.drift = true; this.driftDirection = Math.sign(steer); this.driftCharge = 0; }
    if (this.drift && (!input.drift || Math.sign(steer) !== this.driftDirection || Math.abs(this.speed) < this.tuning.driftMinSpeed)) this.releaseDrift();
    const steerStrength = this.airborne ? this.tuning.airSteerRate : this.tuning.steerRate * (1 - (Math.min(Math.abs(this.speed), this.tuning.maxSpeed) / this.tuning.maxSpeed) * (1 - this.tuning.highSpeedSteerFactor));
    const driftMultiplier = this.drift ? this.tuning.driftSteerMultiplier : 1;
    // Three.js' positive-Y yaw appears screen-left from our behind-the-kart
    // camera. Invert it here so negative steer (A/Left) visibly turns left
    // and positive steer (D/Right) visibly turns right.
    this.yaw -= steer * steerStrength * driftMultiplier * dt * (this.speed >= 0 ? 1 : -1);
    const grip = this.drift ? this.tuning.driftGrip : this.tuning.normalGrip;
    const desiredLateral = this.drift ? -steer * Math.abs(this.speed) * .58 : 0;
    this.lateralSpeed += (desiredLateral - this.lateralSpeed) * Math.min(1, grip * dt);
    if (this.drift) {
      const angle = Math.abs(Math.atan2(this.lateralSpeed, Math.max(1, Math.abs(this.speed))));
      if (angle > this.tuning.driftCancelAngle || this.offRoad || this.airborne || this.hitTimer > 0) { this.drift = false; this.driftCharge = 0; }
      else if (Math.abs(steer) > .25) this.driftCharge = Math.min(this.tuning.driftTiers.at(-1).seconds, this.driftCharge + dt * Math.min(1.35, Math.abs(this.speed) / 11));
    }
    const f = this.forward(), r = this.right(); this.position.addScaledVector(f, this.speed * dt).addScaledVector(r, this.lateralSpeed * dt);
    const q = track.constrain(this); this.progress = q.t; this.offRoad = !q.onRoad;
    if (q.onRoad) { this.lastSafe.copy(this.position); this.lastSafeYaw = this.yaw; }
    if (!this.airborne && track.isOnJump(this.progress) && Math.abs(this.speed) > 9 && !this.jumpUsed) { this.airborne = true; this.verticalSpeed = this.tuning.jumpVelocity; this.jumpUsed = true; }
    if (!track.isOnJump(this.progress)) this.jumpUsed = false;
    const settledY = q.p.y + track.roadSurfaceOffset + this.wheelGroundOffset;
    if (this.airborne) { this.verticalSpeed -= this.tuning.gravity * dt; this.position.y += this.verticalSpeed * dt; if (this.position.y <= settledY) { this.position.y = settledY; this.verticalSpeed = 0; this.airborne = false; this.hitTimer = .1; } }
    else this.position.y = settledY;
    this.lean += ((this.drift ? steer * -.34 : steer * -.18) - this.lean) * Math.min(1, 7 * dt);
    this.pitch += (((forwardInput - brake) * -.055 + (this.airborne ? -.12 : 0)) - this.pitch) * Math.min(1, 6 * dt);
  }
}
