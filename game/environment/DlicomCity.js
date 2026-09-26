import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

function signTexture(label, accent = '#4e6cff') {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#07131f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, accent); gradient.addColorStop(1, '#a653ff');
  ctx.fillStyle = gradient; ctx.fillRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.fillStyle = '#f7fbff'; ctx.font = '700 25px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 128, 33);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function facadeTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f1f7ff'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#23445e';
  for (let y = 6; y < 60; y += 15) for (let x = 6; x < 60; x += 15) ctx.fillRect(x, y, 8, 9);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(.8, 1.2); return texture;
}

// Lightweight, deliberately modular city dressing. It has no colliders: the
// existing curb/query system remains the sole source of racing physics.
export class DlicomCity {
  constructor(scene, track, quality = 'high') {
    this.scene = scene; this.track = track; this.root = new THREE.Group(); this.root.name = 'DLICOM_CITY'; scene.add(this.root);
    this.near = new THREE.Group(); this.props = new THREE.Group(); this.far = new THREE.Group(); this.root.add(this.near, this.props, this.far);
    this.unitBox = new THREE.BoxGeometry(1, 1, 1);
    const facade = facadeTexture();
    this.materials = {
      navy: new THREE.MeshStandardMaterial({ color: 0x14243d, map: facade, roughness: .72, metalness: .12 }),
      blue: new THREE.MeshStandardMaterial({ color: 0x315df4, map: facade, roughness: .6, metalness: .18 }),
      violet: new THREE.MeshStandardMaterial({ color: 0x7048d7, map: facade, roughness: .65, metalness: .12 }),
      cream: new THREE.MeshStandardMaterial({ color: 0xe9f2f5, map: facade, roughness: .82 }),
      window: new THREE.MeshStandardMaterial({ color: 0x62b8ff, emissive: 0x173c85, emissiveIntensity: .45, roughness: .32, metalness: .25 }),
      mint: new THREE.MeshStandardMaterial({ color: 0x38d9c1, roughness: .65 }),
      foliage: new THREE.MeshStandardMaterial({ color: 0x2e9b77, roughness: 1 }),
      trunk: new THREE.MeshStandardMaterial({ color: 0x694a36, roughness: 1 }),
      asphalt: new THREE.MeshStandardMaterial({ color: 0x34465a, roughness: .92 }),
      sign: new THREE.MeshBasicMaterial({ map: signTexture('DLICOM CITY'), side: THREE.DoubleSide }),
      racers: new THREE.MeshBasicMaterial({ map: signTexture('DLICOM RACERS', '#279dff'), side: THREE.DoubleSide }),
    };
    this.buildBlocks(); this.buildStreetProps(); this.buildLandmarks(); this.buildSkyline(); this.setQuality(quality);
  }
  pose(t, side, distance) {
    const s = this.track.sampleAt(t); const position = s.p.clone().addScaledVector(s.normal, side * distance); const yaw = Math.atan2(s.tangent.x, s.tangent.z); return { s, position, yaw };
  }
  addBox(group, position, size, material, yaw = 0, name = 'CITY_BLOCK') {
    const mesh = new THREE.Mesh(this.unitBox, material); mesh.name = name; mesh.position.copy(position); mesh.position.y += size[1] / 2; mesh.scale.set(...size); mesh.rotation.y = yaw; mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  buildBlocks() {
    const districts = [
      { start: .08, end: .27, side: -1, dense: true }, { start: .30, end: .47, side: 1, dense: true },
      { start: .50, end: .61, side: -1, dense: false }, { start: .66, end: .83, side: 1, dense: false },
      { start: .84, end: .96, side: -1, dense: true },
    ];
    const palette = [this.materials.navy, this.materials.blue, this.materials.violet, this.materials.cream];
    // The road is 14.4 units wide and its curb/sidewalk band reaches beyond
    // that.  This keeps even the widest building footprint clear of both.
    const cityClearance = this.track.width / 2 + 8.05;
    const buildings = palette.map(() => []); const windows = []; const awnings = [];
    districts.forEach((district, districtIndex) => {
      const count = district.dense ? 7 : 4;
      for (let i = 0; i < count; i += 1) {
        const t = district.start + (district.end - district.start) * (i / Math.max(1, count - 1));
        const p = this.pose(t, district.side, cityClearance + (i % 2) * 2.2);
        const width = 4.8 + (i % 3) * 1.25, height = (district.dense ? 10 : 6.5) + ((i * 5 + districtIndex) % 4) * 3, depth = 5.6 + (i % 2) * 1.4;
        const material = (i + districtIndex) % palette.length;
        buildings[material].push({ position: p.position, yaw: p.yaw, width, height, depth });
        // Building local X is the across-road axis, so its road-facing facade
        // is at half of `width`, not half of its along-road `depth`.
        const face = p.position.clone().addScaledVector(p.s.normal, -district.side * (width / 2 + .035));
        windows.push({ position: face, yaw: p.yaw, width: depth * .68, height: height * .42 });
        if (i % 3 === 0) awnings.push({ position: p.position.clone().addScaledVector(p.s.normal, district.side * .1), yaw: p.yaw, width: width * .75 });
      }
    });
    const matrix = new THREE.Matrix4(); const quaternion = new THREE.Quaternion();
    buildings.forEach((entries, materialIndex) => {
      const mesh = new THREE.InstancedMesh(this.unitBox, palette[materialIndex], entries.length);
      entries.forEach((entry, index) => { quaternion.setFromAxisAngle(UP, entry.yaw); matrix.compose(new THREE.Vector3(entry.position.x, entry.height / 2, entry.position.z), quaternion, new THREE.Vector3(entry.width, entry.height, entry.depth)); mesh.setMatrixAt(index, matrix); });
      mesh.name = 'CITY_BUILDINGS'; mesh.instanceMatrix.needsUpdate = true; mesh.receiveShadow = true; this.near.add(mesh);
    });
    const windowMesh = new THREE.InstancedMesh(this.unitBox, this.materials.window, windows.length);
    // Local X faces the road after a track-aligned yaw; keeping this panel
    // thin on X makes the inexpensive windows readable from the race camera.
    windows.forEach((entry, index) => { quaternion.setFromAxisAngle(UP, entry.yaw); matrix.compose(new THREE.Vector3(entry.position.x, entry.height * .58, entry.position.z), quaternion, new THREE.Vector3(.06, entry.height, entry.width)); windowMesh.setMatrixAt(index, matrix); });
    windowMesh.name = 'CITY_WINDOW_FACADES'; windowMesh.instanceMatrix.needsUpdate = true; this.near.add(windowMesh);
    const awningMesh = new THREE.InstancedMesh(this.unitBox, this.materials.mint, awnings.length);
    awnings.forEach((entry, index) => { quaternion.setFromAxisAngle(UP, entry.yaw); matrix.compose(new THREE.Vector3(entry.position.x, .14, entry.position.z), quaternion, new THREE.Vector3(entry.width, .28, .7)); awningMesh.setMatrixAt(index, matrix); });
    awningMesh.name = 'CITY_AWNINGS'; awningMesh.instanceMatrix.needsUpdate = true; this.near.add(awningMesh);
  }
  buildStreetProps() {
    const postGeo = new THREE.CylinderGeometry(.07, .1, 4.3, 6), lampGeo = new THREE.SphereGeometry(.22, 8, 6);
    const treeGeo = new THREE.ConeGeometry(.72, 2.3, 6), planterGeo = new THREE.CylinderGeometry(.48, .62, .38, 6);
    const lamps = new THREE.InstancedMesh(postGeo, this.materials.navy, 36), bulbs = new THREE.InstancedMesh(lampGeo, this.materials.cream, 36), trees = new THREE.InstancedMesh(treeGeo, this.materials.foliage, 24), planters = new THREE.InstancedMesh(planterGeo, this.materials.cream, 24);
    const matrix = new THREE.Matrix4(); let l = 0, tr = 0;
    for (let i = 0; i < 36; i += 1) { const t = (i / 36 + .02) % 1, side = i % 2 ? -1 : 1, p = this.pose(t, side, 10.45); matrix.makeTranslation(p.position.x, 2.15, p.position.z); lamps.setMatrixAt(l, matrix); matrix.makeTranslation(p.position.x, 4.28, p.position.z); bulbs.setMatrixAt(l++, matrix); }
    for (let i = 0; i < 24; i += 1) { const p = this.pose((.18 + i / 24 * .72) % 1, i % 2 ? -1 : 1, 10.0); matrix.makeTranslation(p.position.x, .19, p.position.z); planters.setMatrixAt(tr, matrix); matrix.makeTranslation(p.position.x, 1.5, p.position.z); trees.setMatrixAt(tr++, matrix); }
    [lamps, bulbs, trees, planters].forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = false; mesh.receiveShadow = false; this.props.add(mesh); });
    // Direction signage stays outside the racing corridor and remains present on low quality.
    [.17, .38, .72, .89].forEach((t, i) => { const p = this.pose(t, i % 2 ? -1 : 1, 9.35); const sign = new THREE.Mesh(new THREE.BoxGeometry(2.1, .82, .08), this.materials.racers); sign.position.copy(p.position); sign.position.y = 2.1; sign.rotation.y = p.yaw; this.props.add(sign); });
  }
  buildLandmarks() {
    const hq = this.pose(.07, 1, 18); this.addBox(this.near, hq.position, [11, 23, 10], this.materials.navy, hq.yaw, 'DLICOM_HQ');
    const crown = hq.position.clone(); crown.y = 23.7; this.addBox(this.near, crown, [12.4, 1.2, 11.2], this.materials.blue, hq.yaw, 'DLICOM_HQ_CROWN');
    const hqSign = new THREE.Mesh(new THREE.BoxGeometry(8.8, 2.1, .1), this.materials.sign); hqSign.position.copy(hq.position).addScaledVector(hq.s.normal, -1.7); hqSign.position.y = 16; hqSign.rotation.y = hq.yaw; this.near.add(hqSign);
    const start = this.track.sampleAt(0); const yaw = Math.atan2(start.tangent.x, start.tangent.z);
    for (const side of [-1, 1]) { const pos = start.p.clone().addScaledVector(start.normal, side * (this.track.width / 2 + 2.7)); this.addBox(this.near, pos, [.48, 6.2, .48], this.materials.blue, yaw, 'DLICOM_GATE_POST'); }
    const gate = new THREE.Mesh(new THREE.BoxGeometry(this.track.width + 5.4, 1.35, .32), this.materials.sign); gate.position.copy(start.p); gate.position.y = 6.15; gate.rotation.y = yaw; this.near.add(gate);
    // The plaza is deliberately beyond the near-building clearance, not a
    // road decoration. Its smaller footprint leaves the pavement uninterrupted.
    const plaza = this.pose(.56, 1, 19); this.addBox(this.near, plaza.position, [8, .12, 8], this.materials.asphalt, plaza.yaw, 'DLICOM_PLAZA');
    const orb = new THREE.Mesh(new THREE.SphereGeometry(1.35, 16, 12), this.materials.blue); orb.position.copy(plaza.position); orb.position.y = 2.05; this.near.add(orb);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(.34, .34, .18), this.materials.cream); [-.48, .48].forEach(x => { const e = eye.clone(); e.position.copy(plaza.position).add(new THREE.Vector3(x, 2.2, -1.22)); this.near.add(e); });
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.7, .10, 6, 18), this.materials.violet); halo.position.copy(plaza.position); halo.position.y = 2.05; halo.rotation.x = Math.PI / 2; this.near.add(halo);
  }
  buildSkyline() {
    const geo = new THREE.BoxGeometry(1, 1, 1), materials = [this.materials.navy, this.materials.blue, this.materials.violet];
    materials.forEach((mat, k) => { const mesh = new THREE.InstancedMesh(geo, mat, 22); const m = new THREE.Matrix4(); for (let i = 0; i < 22; i += 1) { const p = this.pose((i / 22 + k * .015) % 1, i % 2 ? -1 : 1, 36 + (i % 4) * 5); const w = 5 + (i % 3) * 2, h = 12 + ((i * 7 + k) % 6) * 5, d = 5 + (i % 2) * 3; m.compose(new THREE.Vector3(p.position.x, h / 2, p.position.z), new THREE.Quaternion().setFromAxisAngle(UP, p.yaw), new THREE.Vector3(w, h, d)); mesh.setMatrixAt(i, m); } mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = false; this.far.add(mesh); });
  }
  setQuality(profile) { this.props.visible = profile !== 'low'; this.far.visible = profile !== 'low'; this.near.traverse(node => { if (node.isMesh) node.castShadow = profile === 'high' && node.name === 'DLICOM_HQ'; }); }
}
