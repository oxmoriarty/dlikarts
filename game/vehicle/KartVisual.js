import * as THREE from 'three';
import { tumbleGroundLift, impactTumblePose } from './tumbleMath.js';
import { ExhaustFlames } from './ExhaustFlames.js?v=quang-1';

const find = (root, name) => root.getObjectByName(name);

export class KartVisual {
  constructor(kart, kartScene, characterScene = null, clips = []) {
    this.kart = kart; this.root = new THREE.Group(); this.model = kartScene; this.root.add(this.model); this.distance = 0; this.mixer = null; this.actions = new Map(); this.active = null;
    if (characterScene) {
      this.character = characterScene; this.model.updateMatrixWorld(true); const seat = find(this.model, 'DRIVER_SEAT');
      if (!seat) throw new Error('Approved kart is missing DRIVER_SEAT');
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); seat.matrixWorld.decompose(p, q, s);
      this.character.position.copy(p); this.character.quaternion.copy(q); this.character.scale.setScalar(.8); this.model.add(this.character);
      this.mixer = new THREE.AnimationMixer(this.character); clips.forEach(clip => this.actions.set(clip.name, this.mixer.clipAction(clip))); this.play('seated-idle');
    }
    this.wheels = ['WHEEL_FL','WHEEL_FR','WHEEL_RL','WHEEL_RR'].map(name => find(this.model, name));
    this.wheelRadii = this.wheels.map(wheel => wheel?.userData.importedWheel ? new THREE.Box3().setFromObject(wheel).getSize(new THREE.Vector3()).y / 2 : .42);
    this.wheelAngles = this.wheels.map(() => 0);
    this.frontSteerAngle = 0;
    this.front = ['STEER_WHEEL_FL','STEER_WHEEL_FR'].map(name => find(this.model, name)); this.steering = find(this.model, 'STEERING_WHEEL');
    // Cache the complete kart/driver bounds once. Tumble then uses this small
    // numeric bound instead of a per-frame scene traversal to keep the model
    // above the solid road plane while it rolls.
    this.model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.model);
    this.tumbleBounds = { minX: box.min.x, maxX: box.max.x, minY: box.min.y, maxY: box.max.y, minZ: box.min.z, maxZ: box.max.z };
    this.modelRestPosition = this.model.position.clone();
    // Rotate around the chassis mass, not the ground under the tires. The
    // driver's head is deliberately not the centre of the rotational pivot.
    this.tumblePivot = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y + (box.max.y - box.min.y) * .32, (box.min.z + box.max.z) / 2);
    this.rotatedTumblePivot = new THREE.Vector3();
    this.tumbleLaunchHeight = Math.max(.65, (box.max.x - box.min.x) * .6);
    this.exhaust = new ExhaustFlames(this.model);
  }
  play(name) { const next = this.actions.get(name); if (!next || this.active === next) return; if (this.active) this.active.fadeOut(.12); next.reset().fadeIn(.12).play(); this.active = next; }
  update(dt) {
    this.exhaust.update(dt,this.kart);
    const delta = this.kart.speed * dt; this.distance += delta / .42;
    // The exported GLB's visual nose points opposite the controller's +Z-forward
    // convention after glTF axis conversion. Keep that adaptation at this single
    // asset boundary so physics, track, and camera all retain one forward axis.
    this.root.position.copy(this.kart.position); this.root.rotation.set(0, this.kart.yaw + Math.PI, 0);
    // Battle Pod rolls the complete kart/driver model through a full visible
    // tumble while physics keeps the racer recoverable on the racing surface.
    const tumble = this.kart.tumbleAngle || 0;
    const timedImpact = this.kart.tumbleTimer > 0 && this.kart.tumbleDuration > 0;
    const pose = timedImpact ? impactTumblePose(1 - this.kart.tumbleTimer / this.kart.tumbleDuration, this.kart.tumbleDirection, this.kart.tumbleTurns) : null;
    const roll = pose ? pose.roll : this.kart.lean + tumble;
    const pitch = pose ? pose.pitch + pose.settle : this.kart.pitch + Math.sin(tumble) * .16;
    this.model.rotation.z = roll; this.model.rotation.x = pitch;
    this.model.position.copy(this.modelRestPosition);
    if (pose || tumble) {
      this.rotatedTumblePivot.copy(this.tumblePivot).applyEuler(this.model.rotation);
      this.model.position.add(this.tumblePivot).sub(this.rotatedTumblePivot);
      // Conservative full-driver bounds protect the road even upside down.
      // The ballistic lift dominates the middle of the roll; clearance only
      // catches its extremes instead of lifting the kart by its ground origin.
      const clearance = Math.max(0, tumbleGroundLift(this.tumbleBounds, roll, pitch) - (this.model.position.y - this.modelRestPosition.y));
      this.root.position.y += Math.max(clearance, pose ? pose.lift * this.tumbleLaunchHeight : 0);
    }
    this.wheels.forEach((wheel, i) => {
      if (!wheel) return;
      this.wheelAngles[i] = (this.wheelAngles[i] + delta / Math.max(.05, this.wheelRadii[i])) % (Math.PI * 2);
      wheel.rotation.x = this.wheelAngles[i];
    });
    const angle = -this.kart.lean * 1.3;
    const steerTarget = Number.isFinite(this.kart.visualSteer) ? -this.kart.visualSteer * .45 : THREE.MathUtils.clamp(this.kart.lean * 1.8, -.42, .42);
    this.frontSteerAngle += (steerTarget - this.frontSteerAngle) * (1 - Math.exp(-16 * dt));
    this.front.forEach((node, i) => {
      if (!node) return;
      // Imported pivots are glTF Y-up; the older authored rig uses Z-up.
      if (this.wheels[i]?.userData.importedWheel) node.rotation.y = this.frontSteerAngle;
      else node.rotation.z = angle;
    });
    if (this.steering) this.steering.rotation.y = angle * 6;
    if (this.mixer) { this.mixer.update(dt); this.play(this.kart.drift ? (this.kart.lean > 0 ? 'steer-right' : 'steer-left') : 'seated-idle'); }
  }
}
