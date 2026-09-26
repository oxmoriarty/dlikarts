import * as THREE from 'three';
import { ObjectPool } from '../core/ObjectPool.js';
import { POWERUP_TUNING } from '../config/game-config.js?v=shield-and-checkers';

const TYPES = ['ZIPCAP', 'RATTLE POD', 'HALO GUARD'];
const PICKUP_RADIUS = 1.35;
const MAT = {
  speed: new THREE.MeshStandardMaterial({ color: 0x8deeff, emissive: 0x198cb8, emissiveIntensity: .65, roughness: .28, metalness: .16 }),
  speedCore: new THREE.MeshStandardMaterial({ color: 0x07131d, roughness: .34, metalness: .35 }),
  haloBody: new THREE.MeshStandardMaterial({ color: 0x5e175d, emissive: 0x28012a, emissiveIntensity: .7, roughness: .28, metalness: .14 }),
  haloGlow: new THREE.MeshBasicMaterial({ color: 0xff4fcc, transparent: true, opacity: .9 }),
  shieldBubble: new THREE.MeshPhongMaterial({ color: 0x6cf2a7, emissive: 0x0c5b36, specular: 0xe1fff0, shininess: 85, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false }),
  shieldRim: new THREE.MeshBasicMaterial({ color: 0x9dffd0, transparent: true, opacity: .72, depthWrite: false }),
  mascot: new THREE.MeshStandardMaterial({ color: 0x155cff, emissive: 0x0625a0, emissiveIntensity: .55, roughness: .26, metalness: .12 }),
  mascotDark: new THREE.MeshStandardMaterial({ color: 0x06133f, roughness: .34, metalness: .18 }),
  eye: new THREE.MeshBasicMaterial({ color: 0xe9f6ff }),
};
const SHIELD_BUBBLE = new THREE.SphereGeometry(2.52, 16, 10);
const SHIELD_RIM = new THREE.TorusGeometry(2.525, .026, 5, 20);

function addMesh(group, geometry, material, position = null, rotation = null, scale = null) {
  const mesh = new THREE.Mesh(geometry, material);
  if (position) mesh.position.copy(position);
  if (rotation) mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  if (scale) mesh.scale.copy(scale);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function speedBlade(points, y) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .07, bevelEnabled: true, bevelSegments: 1, bevelSize: .018, bevelThickness: .018 }), MAT.speed);
  // ExtrudeGeometry is naturally drawn in the X/Y plane. Keeping that plane
  // upright makes Zipcap read as a vertical sign/icon when it spins on Y.
  blade.position.y = y; blade.castShadow = true;
  return blade;
}

function createSpeedPickup() {
  // DiliSpeed: two cyan swooshes surrounding a dark diamond core.
  const group = new THREE.Group(); group.name = 'PICKUP_DILI_SPEED';
  const upper = speedBlade([[-.58,.02],[-.14,.30],[.64,.50],[.15,.04],[-.34,-.13]], .04);
  const lower = speedBlade([[-.64,-.50],[.14,-.30],[.58,-.02],[.34,.13],[-.15,-.04]], .09);
  group.add(upper, lower);
  addMesh(group, new THREE.BoxGeometry(.20, .20, .09), MAT.speedCore, new THREE.Vector3(0,.05,.08), new THREE.Euler(0,0,Math.PI / 4));
  addMesh(group, new THREE.TorusGeometry(.18,.025,4,4), MAT.speed, new THREE.Vector3(0,.05,.14), new THREE.Euler(0,0,Math.PI / 4));
  return group;
}

function addDiamondEye(group, x, z = .31) {
  addMesh(group, new THREE.BoxGeometry(.105,.07,.026), MAT.eye, new THREE.Vector3(x,.03,z), new THREE.Euler(0,0,Math.PI / 4));
  addMesh(group, new THREE.BoxGeometry(.035,.035,.03), MAT.mascotDark, new THREE.Vector3(x + (x < 0 ? .018 : -.018),.03,z + .018), new THREE.Euler(0,0,Math.PI / 4));
}

function createMascotPickup() {
  // DiliMascot: round cobalt mascot, blue side arms, and diamond eyes.
  const group = new THREE.Group(); group.name = 'PICKUP_DILI_MASCOT';
  addMesh(group, new THREE.SphereGeometry(.34, 12, 8), MAT.mascot);
  addMesh(group, new THREE.SphereGeometry(.275, 10, 7), MAT.mascotDark, new THREE.Vector3(0,-.015,.10), null, new THREE.Vector3(.9,.82,.46));
  for (const side of [-1,1]) addMesh(group, new THREE.CapsuleGeometry(.045,.20,3,6), MAT.mascot, new THREE.Vector3(side*.40,.02,0), new THREE.Euler(0,0,side * Math.PI / 2.9));
  addDiamondEye(group,-.115); addDiamondEye(group,.115);
  return group;
}

function createHaloPickup() {
  // DiliHalo: purple face orb contained by two vivid pink halo rings.
  const group = new THREE.Group(); group.name = 'PICKUP_DILI_HALO';
  addMesh(group, new THREE.SphereGeometry(.31, 12, 8), MAT.haloBody);
  addMesh(group, new THREE.TorusGeometry(.40,.028,6,18), MAT.haloGlow, new THREE.Vector3(0,0,.02), new THREE.Euler(Math.PI / 2,0,0));
  addMesh(group, new THREE.TorusGeometry(.34,.018,6,18), MAT.haloGlow, new THREE.Vector3(0,0,.12), new THREE.Euler(Math.PI / 2,0,Math.PI / 4));
  addDiamondEye(group,-.105,.29); addDiamondEye(group,.105,.29);
  return group;
}

function createPickupModel(type) {
  if (type === 'ZIPCAP') return createSpeedPickup();
  if (type === 'RATTLE POD') return createMascotPickup();
  return createHaloPickup();
}

function createHaloShield() {
  // The active guard is deliberately a complete, readable bubble around the
  // driver and kart, not merely a ring beneath the vehicle.
  const group = new THREE.Group();
  group.name = 'ACTIVE_HALO_GUARD_BUBBLE';
  const bubble = addMesh(group, SHIELD_BUBBLE, MAT.shieldBubble);
  const equator = addMesh(group, SHIELD_RIM, MAT.shieldRim, null, new THREE.Euler(Math.PI / 2, 0, 0));
  const meridian = addMesh(group, SHIELD_RIM, MAT.shieldRim, null, new THREE.Euler(0, Math.PI / 2, 0));
  [bubble, equator, meridian].forEach((mesh, index) => { mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 3 + index; });
  return group;
}

export class PowerupSystem {
  constructor(scene, track) {
    this.scene = scene; this.track = track; this.pickups = []; this.projectiles = new ObjectPool(() => this.createProjectile(), 8); this.rings = new Map();
    [.075,.19,.31,.55,.70,.84].forEach((progress, i) => this.addPickup(progress, i));
  }
  addPickup(progress, index) {
    const type = TYPES[index % 3]; const s = this.track.sampleAt(progress); const mesh = createPickupModel(type);
    // Spread item boxes across the wider circuit so all five lanes have a
    // sensible collection opportunity rather than rewarding only the center.
    const pickupLanes = [-3.2, 0, 3.2, -2.1, 2.1, 0];
    mesh.position.copy(s.p).addScaledVector(s.normal, pickupLanes[index]); mesh.position.y += .62; mesh.castShadow = true; this.scene.add(mesh); this.pickups.push({ progress, type: TYPES[index % 3], mesh, baseY: mesh.position.y, timer: 0 });
  }
  createProjectile() {
    const mesh = createMascotPickup(); mesh.name = 'PROJECTILE_DILI_MASCOT'; mesh.scale.setScalar(.72); mesh.visible = false; this.scene.add(mesh);
    return { active: false, mesh, direction: new THREE.Vector3(), speed: 17, owner: null, age: 0 };
  }
  update(dt, racers) {
    this.pickups.forEach(pickup => { if (pickup.timer > 0) { pickup.timer -= dt; pickup.mesh.visible = false; return; } pickup.mesh.visible = true; pickup.mesh.rotation.y += dt * 2.4; pickup.mesh.position.y = pickup.baseY + Math.sin(performance.now() * .004 + pickup.progress * 8) * .06; for (const racer of racers) {
      if (racer.kart.finished || racer.kart.item) continue;
      // Pickups are road-plane game objects.  Testing X/Z only gives a clear,
      // forgiving kart-sized collection volume instead of requiring the root
      // transform to intersect a hovering visual mesh vertically.
      const dx = racer.kart.position.x - pickup.mesh.position.x, dz = racer.kart.position.z - pickup.mesh.position.z;
      if (dx * dx + dz * dz <= PICKUP_RADIUS * PICKUP_RADIUS) { racer.kart.item = pickup.type; pickup.timer = 5; break; }
    } });
    this.projectiles.items.forEach(projectile => { if (!projectile.active) return; projectile.age += dt;
      // `direction` is captured exactly once on firing. Nothing tracks a
      // target or the owner's later steering, so this travels as a straight,
      // horizontal missile for its full lifetime.
      projectile.mesh.position.addScaledVector(projectile.direction, projectile.speed * dt);
      if (projectile.age > 2.2) return this.hideProjectile(projectile); for (const target of racers) { if (target === projectile.owner || target.kart.finished || target.kart.guardTimer > 0) continue; if (target.kart.position.distanceToSquared(projectile.mesh.position) < 1.5) { target.kart.hitTimer = .5; target.kart.speed *= .55; target.kart.lateralSpeed += 5 * (Math.random() > .5 ? 1 : -1); this.hideProjectile(projectile); break; } } });
    racers.forEach(racer => this.updateGuard(racer));
  }
  use(racer) {
    const type = racer.kart.item; if (!type) return false; racer.kart.item = null;
    if (type === 'ZIPCAP') { racer.kart.boostTimer = Math.max(racer.kart.boostTimer, .85); racer.kart.boostStrength = Math.max(racer.kart.boostStrength, 9); return true; }
    if (type === 'HALO GUARD') { racer.kart.guardTimer = POWERUP_TUNING.haloGuardSeconds; return true; }
    const projectile = this.projectiles.acquire(); if (!projectile) return false;
    const launchDirection = racer.kart.forward(new THREE.Vector3()).normalize();
    projectile.active = true; projectile.owner = racer; projectile.age = 0; projectile.mesh.visible = true;
    projectile.direction.copy(launchDirection);
    projectile.mesh.position.copy(racer.kart.position).addScaledVector(launchDirection, 1.1).add(new THREE.Vector3(0,.6,0));
    // The mascot's face points along its fixed launch direction; it does not
    // spin or curve after firing.
    projectile.mesh.rotation.set(0, Math.atan2(launchDirection.x, launchDirection.z), 0);
    return true;
  }
  isProjectileThreat(racer) {
    // A shield is saved for a real incoming missile rather than activated as
    // soon as the CPU happens to pick it up. This keeps Halo Guard useful and
    // gives every racer meaningful counterplay against Rattle Pod attacks.
    for (const projectile of this.projectiles.items) {
      if (!projectile.active || projectile.owner === racer) continue;
      const toRacer = racer.kart.position.clone().sub(projectile.mesh.position).setY(0);
      const forwardDistance = toRacer.dot(projectile.direction);
      if (forwardDistance < 0 || forwardDistance > projectile.speed * 1.1) continue;
      const lateralDistanceSq = toRacer.lengthSq() - forwardDistance * forwardDistance;
      if (lateralDistanceSq < 2.1) return true;
    }
    return false;
  }
  updateGuard(racer) {
    let ring = this.rings.get(racer); if (racer.kart.guardTimer > 0) { if (!ring) { ring = createHaloShield(); this.scene.add(ring); this.rings.set(racer, ring); } ring.visible = true; ring.position.copy(racer.kart.position).add(new THREE.Vector3(0,1.0,0)); ring.rotation.y += .06; } else if (ring) ring.visible = false;
  }
  hideProjectile(projectile) { projectile.active = false; projectile.mesh.visible = false; projectile.owner = null; }
}
