import * as THREE from 'three';

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
    this.front = ['STEER_WHEEL_FL','STEER_WHEEL_FR'].map(name => find(this.model, name)); this.steering = find(this.model, 'STEERING_WHEEL');
  }
  play(name) { const next = this.actions.get(name); if (!next || this.active === next) return; if (this.active) this.active.fadeOut(.12); next.reset().fadeIn(.12).play(); this.active = next; }
  update(dt) {
    const delta = this.kart.speed * dt; this.distance += delta / .42;
    // The exported GLB's visual nose points opposite the controller's +Z-forward
    // convention after glTF axis conversion. Keep that adaptation at this single
    // asset boundary so physics, track, and camera all retain one forward axis.
    this.root.position.copy(this.kart.position); this.root.rotation.set(0, this.kart.yaw + Math.PI, 0); this.model.rotation.z = this.kart.lean; this.model.rotation.x = this.kart.pitch;
    this.wheels.forEach(wheel => { if (wheel) wheel.rotation.x = this.distance; });
    const angle = -this.kart.lean * 1.3; this.front.forEach(node => { if (node) node.rotation.z = angle; }); if (this.steering) this.steering.rotation.y = angle * 6;
    if (this.mixer) { this.mixer.update(dt); this.play(this.kart.drift ? (this.kart.lean > 0 ? 'steer-right' : 'steer-left') : 'seated-idle'); }
  }
}
