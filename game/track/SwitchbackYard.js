import * as THREE from 'three';
import { KART_TUNING } from '../config/game-config.js?v=competitive-cpu-2';

const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;

export class SwitchbackYard {
  constructor(scene) {
    // Add one complete kart lane to the former four-abreast road. At 14.4 m,
    // the five-racer slice has room to launch 4+1, pass safely, and still
    // retain the clear curb/pavement boundary on both sides.
    this.width = 14.4;
    this.roadSurfaceOffset = .02;
    this.kartWheelGroundOffset = Number.isFinite(KART_TUNING.wheelGroundOffset) ? KART_TUNING.wheelGroundOffset : 0;
    this.gridLaneSpacing = 2.65;
    this.samples = [];
    this.checkpoints = [];
    this.scene = scene;
    // A wide, flowing proving circuit. The very widely spaced control points
    // create long straights and only a handful of large-radius left/right
    // turns. This is deliberately not a sequence of tight chicanes.
    // It remains one closed centerline, so checkpoint and lap calculations
    // retain their existing loop-safe behavior.
    this.curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -58), new THREE.Vector3(35, 0, -58),
      new THREE.Vector3(58, .35, -45), new THREE.Vector3(70, .2, -18),
      new THREE.Vector3(68, 0, 10), new THREE.Vector3(48, .3, 36),
      // One broad S on the east side, with over 30 m between direction changes.
      new THREE.Vector3(68, .65, 62), new THREE.Vector3(30, .75, 76),
      new THREE.Vector3(0, .4, 58), new THREE.Vector3(-27, .6, 50),
      // A second spacious left/right variation on the west half of the loop.
      new THREE.Vector3(-56, .75, 72), new THREE.Vector3(-80, .3, 40),
      new THREE.Vector3(-72, 0, 5), new THREE.Vector3(-85, .3, -30),
      new THREE.Vector3(-55, .2, -58), new THREE.Vector3(-20, 0, -58),
    ], true, 'centripetal');
    this.finishGantry = null;
    this.buildSamples(); this.buildVisuals();
    this.jumpStart = .43; this.jumpEnd = .47;
  }
  buildSamples() {
    const count = 300;
    for (let i = 0; i < count; i += 1) {
      const t = i / count, p = this.curve.getPointAt(t), tangent = this.curve.getTangentAt(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      this.samples.push({ t, p, tangent, normal });
    }
    for (let i = 0; i < 8; i += 1) this.checkpoints.push(i / 8);
  }
  wrapDelta(a, b) { let d = a - b; if (d > .5) d -= 1; if (d < -.5) d += 1; return d; }
  query(position, hint = 0) {
    const count = this.samples.length; let best = null; let bestDist = Infinity;
    const center = Math.round(((hint % 1) + 1) % 1 * count);
    for (let offset = -42; offset <= 42; offset += 1) {
      const s = this.samples[(center + offset + count) % count]; const dx = position.x - s.p.x, dz = position.z - s.p.z;
      const d = dx * dx + dz * dz;
      if (d < bestDist) { bestDist = d; best = s; }
    }
    if (!best || bestDist > 100) {
      for (const s of this.samples) { const dx = position.x - s.p.x, dz = position.z - s.p.z, d = dx * dx + dz * dz; if (d < bestDist) { bestDist = d; best = s; } }
    }
    const lateral = (position.x - best.p.x) * best.normal.x + (position.z - best.p.z) * best.normal.z;
    return { ...best, lateral, distance: Math.sqrt(bestDist), onRoad: Math.abs(lateral) <= this.width * .5, inBounds: Math.abs(lateral) <= this.width * .5 + 3.2 };
  }
  sampleAt(t) { return this.samples[Math.round((((t % 1) + 1) % 1) * (this.samples.length - 1))]; }
  getGridPose(index) {
    // Five-racer slice: a true four-abreast front row plus one centered just
    // behind it. The arrangement visibly proves the road-width requirement
    // while preserving a clear launch camera and recovery-safe spawn point.
    const layout = [
      { row: 0, lane: -1.5 }, { row: 0, lane: -.5 }, { row: 0, lane: .5 }, { row: 0, lane: 1.5 },
      { row: 1, lane: 0 },
    ];
    const slot = layout[index] || layout[layout.length - 1];
    // Grid slots sit immediately before the painted line, so the checkerboard
    // is visibly in front of the racers at the beginning and crossed at GO.
    const base = this.sampleAt(.988 - slot.row * .008);
    return { position: base.p.clone().addScaledVector(base.normal, slot.lane * this.gridLaneSpacing).add(new THREE.Vector3(0, this.roadSurfaceOffset + this.kartWheelGroundOffset, 0)), yaw: Math.atan2(base.tangent.x, base.tangent.z), progress: base.t };
  }
  isOnJump(progress) { return progress > this.jumpStart && progress < this.jumpEnd; }
  buildVisuals() {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x27394c, roughness: .9, metalness: .03, vertexColors: true });
    const verts = [], colors = [], indices = [];
    const colorA = new THREE.Color(0x294256), colorB = new THREE.Color(0x324f62);
    for (let i = 0; i < this.samples.length; i += 1) {
      const s = this.samples[i];
      for (const side of [-1, 1]) {
        const v = s.p.clone().addScaledVector(s.normal, side * this.width / 2); v.y += this.roadSurfaceOffset;
        verts.push(v.x, v.y, v.z); const c = i % 2 ? colorA : colorB; colors.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < this.samples.length; i += 1) { const n = (i + 1) % this.samples.length; indices.push(i * 2, n * 2, i * 2 + 1, n * 2, n * 2 + 1, i * 2 + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    const road = new THREE.Mesh(geo, roadMat); road.receiveShadow = true; this.scene.add(road);
    // Each boundary is a continuous raised curb, followed by a continuous
    // pavement strip on its outside. This is much clearer than sparse blocks:
    // left pavement sits left of the left curb and vice versa on the right.
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xe8d6a9, roughness: .72, metalness: .02, side: THREE.DoubleSide });
    const pavementMat = new THREE.MeshStandardMaterial({ color: 0x707887, roughness: .92, metalness: 0, side: THREE.DoubleSide });
    const makeRibbon = (name, inner, outer, top, base, material, raised) => {
      const positions = [], indices = [];
      for (const s of this.samples) {
        const innerPoint = s.p.clone().addScaledVector(s.normal, inner);
        const outerPoint = s.p.clone().addScaledVector(s.normal, outer);
        positions.push(innerPoint.x, innerPoint.y + top, innerPoint.z, outerPoint.x, outerPoint.y + top, outerPoint.z);
        if (raised) positions.push(innerPoint.x, innerPoint.y + base, innerPoint.z, outerPoint.x, outerPoint.y + base, outerPoint.z);
      }
      const stride = raised ? 4 : 2;
      for (let i = 0; i < this.samples.length; i += 1) {
        const next = (i + 1) % this.samples.length; const a = i * stride, b = next * stride;
        // Top face.
        indices.push(a, b, a + 1, b, b + 1, a + 1);
        if (raised) {
          // Inner and outer vertical faces give the curb a readable profile.
          indices.push(a + 2, a, b, a + 2, b, b + 2);
          indices.push(a + 1, a + 3, b + 3, a + 1, b + 3, b + 1);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.receiveShadow = true; this.scene.add(mesh);
    };
    for (const side of [-1, 1]) {
      const roadEdge = side * this.width / 2;
      const curbOuter = side * (this.width / 2 + .38);
      const pavementOuter = side * (this.width / 2 + 2.65);
      makeRibbon(`CURB_${side < 0 ? 'LEFT' : 'RIGHT'}`, roadEdge, curbOuter, .18, this.roadSurfaceOffset, curbMat, true);
      makeRibbon(`PAVEMENT_${side < 0 ? 'LEFT' : 'RIGHT'}`, curbOuter, pavementOuter, this.roadSurfaceOffset + .01, this.roadSurfaceOffset + .01, pavementMat, false);
    }
    const terrain = new THREE.Mesh(new THREE.CircleGeometry(118, 64), new THREE.MeshStandardMaterial({ color: 0x315744, roughness: 1 })); terrain.rotation.x = -Math.PI / 2; terrain.position.y = -.04; terrain.receiveShadow = true; this.scene.add(terrain);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffd45b });
    for (let i = 0; i < this.samples.length; i += 15) {
      const s = this.samples[i]; const stripe = new THREE.Mesh(new THREE.BoxGeometry(.16, .025, 1.0), stripeMat); stripe.position.copy(s.p).add(new THREE.Vector3(0,.05,0)); stripe.rotation.y = Math.atan2(s.tangent.x, s.tangent.z); this.scene.add(stripe);
    }
    this.checkpoints.forEach((t, index) => this.addGate(t, index));
  }
  addGate(t, index) {
    const s = this.sampleAt(t); const mat = new THREE.MeshStandardMaterial({ color: index === 0 ? 0x58e7cd : 0x58aaff, emissive: index === 0 ? 0x145f54 : 0x10244c, roughness: .45 });
    if (index === 0) {
      this.createStartLine(s);
      this.finishGantry = this.createFinishGantry(s);
      return;
    }
    const height = index === 0 ? 4.35 : 2.55;
    for (const side of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,height,8), mat); post.position.copy(s.p).addScaledVector(s.normal, side * (this.width / 2 - .25)); post.position.y += height / 2; this.scene.add(post); }
    const arch = new THREE.Mesh(new THREE.BoxGeometry(this.width, .16, .16), mat); arch.position.copy(s.p).add(new THREE.Vector3(0,height,0)); arch.rotation.y = Math.atan2(s.tangent.x, s.tangent.z); this.scene.add(arch);
  }
  createStartLine(s) {
    // Make the white field a real surface, then add only raised black tiles.
    // This avoids vertex-color/material interpolation ever turning the whole
    // line dark in a browser renderer.
    const columns = 12, rows = 3, cellWidth = this.width / columns, cellDepth = .82;
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(this.width + .06, .045, rows * cellDepth + .08),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    base.name = 'START_LINE_WHITE_BASE';
    base.position.copy(s.p); base.position.y += this.roadSurfaceOffset + .04; base.rotation.y = yaw;
    this.scene.add(base);
    const checker = new THREE.InstancedMesh(
      new THREE.BoxGeometry(cellWidth * .88, .019, cellDepth * .84),
      new THREE.MeshBasicMaterial({ color: 0x050505 }),
      (columns * rows) / 2,
    );
    checker.name = 'START_LINE_RAISED_BLACK_TILES';
    const rotation = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
    let instance = 0;
    for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
      if ((row + column) % 2 === 0) continue;
      const lateral = -this.width / 2 + cellWidth * (column + .5);
      const longitudinal = (row - (rows - 1) / 2) * cellDepth;
      position.copy(s.p).addScaledVector(s.normal, lateral).addScaledVector(s.tangent, longitudinal);
      position.y += this.roadSurfaceOffset + .072;
      matrix.compose(position, rotation, new THREE.Vector3(1, 1, 1)); checker.setMatrixAt(instance, matrix);
      instance += 1;
    }
    checker.instanceMatrix.needsUpdate = true;
    this.scene.add(checker);
  }
  createFinishGantry(s) {
    // The physical finish structure is visible for every lap. Final-lap state
    // is gameplay, not a reason to hide a crucial track landmark.
    const group = new THREE.Group(); group.name = 'FINAL_LAP_FINISH_GANTRY'; group.position.copy(s.p); group.visible = true;
    const postMat = new THREE.MeshStandardMaterial({ color: 0x11151a, roughness: .46, metalness: .45 });
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.12, .15, 5.45, 8), postMat);
      post.position.copy(s.normal).multiplyScalar(side * (this.width / 2 + .42)); post.position.y = 2.725; post.castShadow = true; group.add(post);
    }
    const columns = 12, rows = 3, cellWidth = this.width / columns, cellHeight = .58;
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);
    const bannerBase = new THREE.Mesh(
      new THREE.BoxGeometry(this.width + .12, rows * cellHeight + .10, .095),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
    );
    bannerBase.name = 'FINISH_LINE_WHITE_BANNER';
    bannerBase.position.y = 3.72 + cellHeight * (rows - 1) / 2; bannerBase.rotation.y = yaw;
    group.add(bannerBase);
    const banner = new THREE.InstancedMesh(
      new THREE.BoxGeometry(cellWidth * .88, cellHeight * .84, .13),
      new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide }),
      (columns * rows) / 2,
    );
    banner.name = 'FINISH_LINE_RAISED_BLACK_TILES';
    const rotation = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
    let instance = 0;
    for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
      if ((row + column) % 2 === 0) continue;
      const lateral = -this.width / 2 + cellWidth * (column + .5);
      position.copy(s.normal).multiplyScalar(lateral); position.y = 3.72 + cellHeight * row;
      matrix.compose(position, rotation, new THREE.Vector3(1, 1, 1)); banner.setMatrixAt(instance, matrix);
      instance += 1;
    }
    banner.instanceMatrix.needsUpdate = true;
    group.add(banner); this.scene.add(group); return group;
  }
  setFinalLapVisual(active) {
    if (this.finishGantry) { this.finishGantry.visible = true; this.finishGantry.userData.finalLapActive = active; }
  }
  constrain(kart) {
    const q = this.query(kart.position, kart.progress);
    if (Math.abs(q.lateral) > this.width / 2 + .55) {
      const sign = Math.sign(q.lateral); const edge = this.width / 2 + .45;
      kart.position.x = q.p.x + q.normal.x * sign * edge; kart.position.z = q.p.z + q.normal.z * sign * edge;
      kart.speed *= .52; kart.lateralSpeed *= -.18; kart.hitTimer = .16;
    }
    return q;
  }
}
