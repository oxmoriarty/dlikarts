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
    this.scene = scene; this.track = track; this.root = new THREE.Group(); this.root.name = 'CITY_STREETSCAPE'; scene.add(this.root);
    this.near = new THREE.Group(); this.props = new THREE.Group(); this.far = new THREE.Group(); this.root.add(this.near, this.props, this.far);
    this.unitBox = new THREE.BoxGeometry(1, 1, 1);
    const facade = facadeTexture();
    this.materials = {
      navy: new THREE.MeshStandardMaterial({ color: 0x14243d, map: facade, roughness: .72, metalness: .12 }),
      blue: new THREE.MeshStandardMaterial({ color: 0x315df4, map: facade, roughness: .6, metalness: .18 }),
      violet: new THREE.MeshStandardMaterial({ color: 0x7048d7, map: facade, roughness: .65, metalness: .12 }),
      cream: new THREE.MeshStandardMaterial({ color: 0xe9f2f5, map: facade, roughness: .82 }),
      coral: new THREE.MeshStandardMaterial({ color: 0xe85f58, map: facade, roughness: .68, metalness: .08 }),
      teal: new THREE.MeshStandardMaterial({ color: 0x25aead, map: facade, roughness: .6, metalness: .1 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xe6a84b, map: facade, roughness: .68, metalness: .08 }),
      window: new THREE.MeshStandardMaterial({ color: 0x62b8ff, emissive: 0x173c85, emissiveIntensity: .45, roughness: .32, metalness: .25 }),
      mint: new THREE.MeshStandardMaterial({ color: 0x38d9c1, roughness: .65 }),
      foliage: new THREE.MeshStandardMaterial({ color: 0x2e9b77, roughness: 1 }),
      trunk: new THREE.MeshStandardMaterial({ color: 0x694a36, roughness: 1 }),
      asphalt: new THREE.MeshStandardMaterial({ color: 0x34465a, roughness: .92 }),
      cable: new THREE.LineBasicMaterial({ color: 0x172234, transparent: true, opacity: .8 }),
    };
    this.buildBlocks(); this.buildStreetProps(); this.buildUrbanDetails(); this.buildSkyline(); this.setQuality(quality);
  }
  pose(t, side, distance) {
    const s = this.track.sampleAt(t); const position = s.p.clone().addScaledVector(s.normal, side * distance); const yaw = Math.atan2(s.tangent.x, s.tangent.z); return { s, position, yaw };
  }
  // Validate every prospective building against the entire closed course—not
  // only the local spline sample. This protects parallel/nearby loop sections.
  safeRoadsidePose(t, side, width, depth, minimumDistance) {
    // Road edge (7.2) + pavement (2.65) + a visible grass/setback strip.
    // Large scenery is never allowed to touch the sidewalk, either.
    const sidewalkClearance = this.track.width / 2 + 2.65 + 2.0;
    const footprintRadius = Math.hypot(width, depth) / 2;
    const requiredDistance = sidewalkClearance + footprintRadius;
    for (let distance = Math.max(minimumDistance, requiredDistance); distance <= 68; distance += 2) {
      const candidate = this.pose(t, side, distance);
      const clear = this.track.samples.every(sample => {
        const dx = candidate.position.x - sample.p.x; const dz = candidate.position.z - sample.p.z;
        return dx * dx + dz * dz >= requiredDistance * requiredDistance;
      });
      if (clear) return candidate;
    }
    return null;
  }
  addBox(group, position, size, material, yaw = 0, name = 'CITY_BLOCK') {
    const mesh = new THREE.Mesh(this.unitBox, material); mesh.name = name; mesh.position.copy(position); mesh.position.y += size[1] / 2; mesh.scale.set(...size); mesh.rotation.y = yaw; mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  buildBlocks() {
    // These short paired ranges are intentionally chosen from the broadest
    // sections of the circuit. Corners remain open for racing sightlines.
    const districts = [
      { start: .035, end: .105, sides: [-1, 1], count: 5 },
      { start: .145, end: .225, sides: [-1, 1], count: 5 },
      { start: .285, end: .350, sides: [-1, 1], count: 5 },
      { start: .405, end: .480, sides: [-1, 1], count: 5 },
      { start: .525, end: .595, sides: [-1, 1], count: 5 },
      { start: .650, end: .730, sides: [-1, 1], count: 5 },
      { start: .785, end: .855, sides: [-1, 1], count: 5 },
      { start: .900, end: .970, sides: [-1, 1], count: 5 },
    ];
    const palette = [this.materials.navy, this.materials.blue, this.materials.violet, this.materials.cream, this.materials.coral, this.materials.teal, this.materials.gold];
    const styles = [
      { label: 'BODEGA', width: 6.4, height: 5.3, depth: 6.0, awning: true },
      { label: 'CAFE', width: 7.0, height: 6.3, depth: 6.4, awning: true },
      { label: 'EATERY', width: 7.8, height: 7.2, depth: 7.0, awning: true },
      { label: 'BANK', width: 8.8, height: 9.2, depth: 7.6 },
      { label: 'SCHOOL', width: 11.4, height: 8.0, depth: 8.4 },
      { label: 'GARAGE', width: 9.4, height: 5.4, depth: 7.6, awning: true },
      { label: 'APARTMENTS', width: 7.4, height: 13.2, depth: 7.2, balconies: true },
      { label: 'OFFICES', width: 8.0, height: 16.5, depth: 7.6, balconies: true },
    ];
    const buildings = palette.map(() => []); const awningGroups = [[], [], []], labels = [], roofTrims = [], storefronts = [], balconies = [];
    const nearGateway = t => this.track.checkpoints.some(checkpoint => {
      let delta = t - checkpoint;
      if (delta > .5) delta -= 1;
      if (delta < -.5) delta += 1;
      return Math.abs(delta) < .026;
    });
    districts.forEach((district, districtIndex) => {
      for (const side of district.sides) {
        for (let i = 0; i < district.count; i += 1) {
          const t = district.start + (district.end - district.start) * (i / Math.max(1, district.count - 1));
          if (nearGateway(t)) continue;
          // A deliberately uneven mix reads as independent shops, civic uses,
          // apartments, and offices rather than one repeated building asset.
          const styleIndex = [0, 6, 1, 3, 2, 5, 4, 7][(i + districtIndex * 2 + (side > 0 ? 1 : 0)) % 8];
          const style = styles[styleIndex]; const { width, height, depth } = style;
          // Building fronts begin after sidewalk + gateway/streetlight/utility
          // clearance. This preserves the road, curbs, pavement, and prop band.
          const frontageSetback = this.track.width / 2 + 2.65 + 4.0 + width / 2;
          const p = this.safeRoadsidePose(t, side, width, depth, frontageSetback);
          if (!p) continue;
          const material = (i + districtIndex * 2 + (side > 0 ? 2 : 0)) % palette.length;
          buildings[material].push({ position: p.position, yaw: p.yaw, width, height, depth });
          const face = p.position.clone().addScaledVector(p.s.normal, -side * (width / 2 + .035));
          roofTrims.push({ position: p.position.clone(), yaw: p.yaw, width: width + .38, height, depth: depth + .38, material: (material + 1) % palette.length });
          if (style.awning || style.label === 'BANK' || style.label === 'SCHOOL') storefronts.push({ position: face.clone().addScaledVector(p.s.normal, -side * .08), yaw: p.yaw, depth: Math.min(depth * .63, 5.0) });
          if (style.awning) awningGroups[(i + districtIndex + (side > 0 ? 1 : 0)) % awningGroups.length].push({ position: face.addScaledVector(p.s.normal, -side * .2), yaw: p.yaw, depth });
          if (style.balconies) for (let y = 3.2; y < height - 1.2; y += 3.25) balconies.push({ position: face.clone().addScaledVector(p.s.normal, -side * .24), yaw: p.yaw, y, depth: Math.min(depth * .72, 5.6) });
          if (i % 2 === 0) labels.push({ label: style.label, position: face, yaw: p.yaw, depth });
          // A staggered back row turns isolated storefronts into recognisable
          // city blocks without encroaching on the prop/sidewalk band.
          const rearStyle = styles[(styleIndex + 3) % styles.length];
          const rearT = t + (side > 0 ? .006 : -.006);
          if (!nearGateway(rearT)) {
            const rearSetback = frontageSetback + width / 2 + rearStyle.width / 2 + 3.2;
            const rear = this.safeRoadsidePose(rearT, side, rearStyle.width, rearStyle.depth, rearSetback);
            if (rear) {
              const rearMaterial = (material + 3) % palette.length;
              buildings[rearMaterial].push({ position: rear.position, yaw: rear.yaw, width: rearStyle.width, height: rearStyle.height * .88, depth: rearStyle.depth });
              roofTrims.push({ position: rear.position.clone(), yaw: rear.yaw, width: rearStyle.width + .32, height: rearStyle.height * .88, depth: rearStyle.depth + .32, material: (rearMaterial + 2) % palette.length });
            }
          }
        }
      }
    });
    const matrix = new THREE.Matrix4(); const quaternion = new THREE.Quaternion();
    palette.forEach((material, materialIndex) => {
      const entries = roofTrims.filter(entry => entry.material === materialIndex);
      if (!entries.length) return;
      const roofMesh = new THREE.InstancedMesh(this.unitBox, material, entries.length);
      entries.forEach((entry, index) => { quaternion.setFromAxisAngle(UP, entry.yaw); matrix.compose(new THREE.Vector3(entry.position.x, entry.height + .18, entry.position.z), quaternion, new THREE.Vector3(entry.width, .36, entry.depth)); roofMesh.setMatrixAt(index, matrix); });
      roofMesh.name = 'CITY_ROOF_TRIMS'; roofMesh.instanceMatrix.needsUpdate = true; this.near.add(roofMesh);
    });
    const storefrontMesh = new THREE.InstancedMesh(this.unitBox, this.materials.window, storefronts.length);
    storefronts.forEach((entry, index) => { quaternion.setFromAxisAngle(UP, entry.yaw); matrix.compose(new THREE.Vector3(entry.position.x, 1.65, entry.position.z), quaternion, new THREE.Vector3(.12, 2.15, entry.depth)); storefrontMesh.setMatrixAt(index, matrix); });
    storefrontMesh.name = 'CITY_STOREFRONTS'; storefrontMesh.instanceMatrix.needsUpdate = true; this.near.add(storefrontMesh);
    buildings.forEach((entries, materialIndex) => {
      const mesh = new THREE.InstancedMesh(this.unitBox, palette[materialIndex], entries.length);
      entries.forEach((entry, index) => { quaternion.setFromAxisAngle(UP, entry.yaw); matrix.compose(new THREE.Vector3(entry.position.x, entry.height / 2, entry.position.z), quaternion, new THREE.Vector3(entry.width, entry.height, entry.depth)); mesh.setMatrixAt(index, matrix); });
      mesh.name = 'CITY_BUILDINGS'; mesh.instanceMatrix.needsUpdate = true; mesh.receiveShadow = true; this.near.add(mesh);
    });
    [this.materials.mint, this.materials.coral, this.materials.gold].forEach((material, groupIndex) => {
      const entries = awningGroups[groupIndex];
      if (!entries.length) return;
      const awningMesh = new THREE.InstancedMesh(this.unitBox, material, entries.length);
      entries.forEach((entry, index) => { quaternion.setFromAxisAngle(UP, entry.yaw); matrix.compose(new THREE.Vector3(entry.position.x, 2.0, entry.position.z), quaternion, new THREE.Vector3(.55, .28, Math.min(entry.depth * .72, 5.2))); awningMesh.setMatrixAt(index, matrix); });
      awningMesh.name = 'CITY_AWNINGS'; awningMesh.instanceMatrix.needsUpdate = true; this.near.add(awningMesh);
    });
    const balconyMesh = new THREE.InstancedMesh(this.unitBox, this.materials.navy, balconies.length);
    balconies.forEach((entry, index) => { quaternion.setFromAxisAngle(UP, entry.yaw); matrix.compose(new THREE.Vector3(entry.position.x, entry.y, entry.position.z), quaternion, new THREE.Vector3(.32, .12, entry.depth)); balconyMesh.setMatrixAt(index, matrix); });
    balconyMesh.name = 'CITY_BALCONIES'; balconyMesh.instanceMatrix.needsUpdate = true; this.near.add(balconyMesh);
    labels.forEach(entry => {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(.07, .7, Math.min(entry.depth * .66, 4.6)), new THREE.MeshBasicMaterial({ map: signTexture(entry.label), side: THREE.DoubleSide }));
      sign.name = `CITY_SIGN_${entry.label}`; sign.position.copy(entry.position); sign.position.y = 3.1; sign.rotation.y = entry.yaw; this.near.add(sign);
    });
  }
  buildStreetProps() {
    const lampBaseGeo = new THREE.CylinderGeometry(.32, .46, .72, 4), lampHeadGeo = new THREE.BoxGeometry(.48, .16, .30);
    const lampCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .42, 0), new THREE.Vector3(0, 4.65, 0), new THREE.Vector3(.12, 5.02, 0), new THREE.Vector3(.48, 5.22, 0), new THREE.Vector3(1.02, 5.22, 0)]);
    const lampPostGeo = new THREE.TubeGeometry(lampCurve, 16, .075, 6, false);
    const utilityPoleGeo = new THREE.CylinderGeometry(.12, .17, 11.8, 6), utilityBarGeo = new THREE.BoxGeometry(1.65, .15, .15);
    const treeGeo = new THREE.ConeGeometry(.72, 2.3, 6), planterGeo = new THREE.CylinderGeometry(.48, .62, .38, 6);
    const lampEntries = [], utilityBySide = [[], []], greenEntries = [];
    // Pairs at a fixed longitudinal interval create a dependable street rhythm.
    // safeRoadsidePose keeps every base after the curb + sidewalk even where the
    // closed course doubles back near itself.
    for (let i = 0; i < 16; i += 1) {
      const t = (i / 16 + .015) % 1;
      for (const side of [-1, 1]) {
        const p = this.safeRoadsidePose(t, side, .5, .5, 12.3);
        if (p) lampEntries.push({ ...p, side });
      }
    }
    for (let i = 0; i < 13; i += 1) {
      const t = (i / 13 + .055) % 1;
      for (const side of [-1, 1]) {
        const p = this.safeRoadsidePose(t, side, .75, .75, 13.0);
        if (p) utilityBySide[side < 0 ? 0 : 1].push({ ...p, side });
      }
    }
    for (let i = 0; i < 24; i += 1) {
      const t = (.18 + i / 24 * .72) % 1, side = i % 2 ? -1 : 1;
      const p = this.safeRoadsidePose(t, side, 1.1, 1.1, 12.5);
      if (p) greenEntries.push({ ...p, side });
    }
    const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
    const lampBases = new THREE.InstancedMesh(lampBaseGeo, this.materials.navy, lampEntries.length);
    const lamps = new THREE.InstancedMesh(lampPostGeo, this.materials.navy, lampEntries.length);
    const bulbs = new THREE.InstancedMesh(lampHeadGeo, this.materials.cream, lampEntries.length);
    lampEntries.forEach((entry, i) => {
      matrix.makeTranslation(entry.position.x, .36, entry.position.z); lampBases.setMatrixAt(i, matrix);
      // The curved arm always reaches inward from the sidewalk side, like the
      // supplied streetlight reference, never into the race surface.
      quaternion.setFromAxisAngle(UP, entry.yaw + (entry.side < 0 ? Math.PI : 0)); matrix.compose(entry.position, quaternion, new THREE.Vector3(1, 1, 1)); lamps.setMatrixAt(i, matrix);
      const head = entry.position.clone().addScaledVector(entry.s.normal, -entry.side * 1.02); head.y = 5.22;
      quaternion.setFromAxisAngle(UP, entry.yaw); matrix.compose(head, quaternion, new THREE.Vector3(1, 1, 1)); bulbs.setMatrixAt(i, matrix);
    });
    const utilityEntries = utilityBySide.flat();
    const utilityPoles = new THREE.InstancedMesh(utilityPoleGeo, this.materials.trunk, utilityEntries.length);
    const utilityBars = new THREE.InstancedMesh(utilityBarGeo, this.materials.trunk, utilityEntries.length);
    utilityEntries.forEach((entry, i) => {
      matrix.makeTranslation(entry.position.x, 5.9, entry.position.z); utilityPoles.setMatrixAt(i, matrix);
      quaternion.setFromAxisAngle(UP, entry.yaw); matrix.compose(new THREE.Vector3(entry.position.x, 11.1, entry.position.z), quaternion, new THREE.Vector3(1, 1, 1)); utilityBars.setMatrixAt(i, matrix);
    });
    const trees = new THREE.InstancedMesh(treeGeo, this.materials.foliage, greenEntries.length), planters = new THREE.InstancedMesh(planterGeo, this.materials.cream, greenEntries.length);
    greenEntries.forEach((entry, i) => { matrix.makeTranslation(entry.position.x, .19, entry.position.z); planters.setMatrixAt(i, matrix); matrix.makeTranslation(entry.position.x, 1.5, entry.position.z); trees.setMatrixAt(i, matrix); });
    [lampBases, lamps, bulbs, utilityPoles, utilityBars, trees, planters].forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = false; mesh.receiveShadow = false; this.props.add(mesh); });
    // Two short, sagging cable runs follow each roadside pole chain. They stop
    // at the final pole instead of cutting a straight line across the lap seam.
    const cableVertices = [];
    utilityBySide.forEach(entries => {
      for (let i = 1; i < entries.length; i += 1) {
        for (const lateral of [-.34, .34]) {
          // The lowest point remains above the 8.1 m gateway header top.
          const a = entries[i - 1].position.clone().addScaledVector(entries[i - 1].s.normal, lateral); a.y = 11.05;
          const b = entries[i].position.clone().addScaledVector(entries[i].s.normal, lateral); b.y = 11.05;
          const sag = a.clone().lerp(b, .5); sag.y = 10.25;
          cableVertices.push(a.x, a.y, a.z, sag.x, sag.y, sag.z, sag.x, sag.y, sag.z, b.x, b.y, b.z);
        }
      }
    });
    if (cableVertices.length) {
      const cableGeometry = new THREE.BufferGeometry(); cableGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cableVertices, 3));
      const cables = new THREE.LineSegments(cableGeometry, this.materials.cable); cables.name = 'CITY_UTILITY_LINES'; this.props.add(cables);
    }
  }
  buildUrbanDetails() {
    // A small reusable prop kit gives the denser streets readable urban detail
    // without adding colliders, individual allocations every frame, or dozens
    // of repeated draw calls.
    const slots = [];
    for (let i = 0; i < 16; i += 1) {
      const t = (i / 16 + .045) % 1;
      for (const side of [-1, 1]) {
        const p = this.safeRoadsidePose(t, side, .8, .8, 12.7);
        if (p) slots.push({ ...p, side });
      }
    }
    const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
    const at = (entry, y, inset = 0) => {
      const position = entry.position.clone().addScaledVector(entry.s.normal, -entry.side * inset);
      position.y = y; return position;
    };
    const batch = (geometry, material, entries, name) => {
      if (!entries.length) return;
      const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
      entries.forEach((entry, index) => {
        quaternion.setFromAxisAngle(UP, entry.yaw || 0);
        matrix.compose(entry.position, quaternion, entry.scale || new THREE.Vector3(1, 1, 1)); mesh.setMatrixAt(index, matrix);
      });
      mesh.name = name; mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = false; mesh.receiveShadow = false; this.props.add(mesh);
    };
    const pick = stride => slots.filter((_, index) => index % stride === 0);
    const cylinder = new THREE.CylinderGeometry(.07, .1, 1, 6);
    const bollardGeo = new THREE.CylinderGeometry(.12, .15, .62, 8);

    // Traffic controls, signal heads, control boxes, and compact roadside signs.
    const traffic = pick(7);
    batch(cylinder, this.materials.navy, traffic.map(entry => ({ position: at(entry, 2.25, .35), yaw: entry.yaw, scale: new THREE.Vector3(1, 4.5, 1) })), 'CITY_TRAFFIC_LIGHT_POSTS');
    batch(this.unitBox, this.materials.navy, traffic.map(entry => ({ position: at(entry, 4.25, .35), yaw: entry.yaw, scale: new THREE.Vector3(.45, .9, .32) })), 'CITY_TRAFFIC_LIGHT_HEADS');
    batch(this.unitBox, this.materials.coral, traffic.map(entry => ({ position: at(entry, 4.5, .55), yaw: entry.yaw, scale: new THREE.Vector3(.08, .13, .12) })), 'CITY_SIGNAL_RED');
    batch(this.unitBox, this.materials.gold, traffic.map(entry => ({ position: at(entry, 4.25, .55), yaw: entry.yaw, scale: new THREE.Vector3(.08, .13, .12) })), 'CITY_SIGNAL_AMBER');
    batch(this.unitBox, this.materials.mint, traffic.map(entry => ({ position: at(entry, 4.0, .55), yaw: entry.yaw, scale: new THREE.Vector3(.08, .13, .12) })), 'CITY_SIGNAL_GREEN');
    batch(this.unitBox, this.materials.trunk, traffic.map(entry => ({ position: at(entry, .55, -.55), yaw: entry.yaw, scale: new THREE.Vector3(.55, 1.1, .45) })), 'CITY_CONTROL_BOXES');
    const signs = pick(5);
    batch(cylinder, this.materials.trunk, signs.map(entry => ({ position: at(entry, 1.0, .45), yaw: entry.yaw, scale: new THREE.Vector3(1, 2.0, 1) })), 'CITY_SIGN_POSTS');
    batch(this.unitBox, this.materials.cream, signs.map(entry => ({ position: at(entry, 2.15, .45), yaw: entry.yaw, scale: new THREE.Vector3(.08, .7, .72) })), 'CITY_ROAD_SIGNS');

    // Furniture: benches, bins/dumpsters, bollards, bus shelters, meters, and mailboxes.
    const benches = pick(4);
    batch(this.unitBox, this.materials.trunk, benches.map(entry => ({ position: at(entry, .68, .2), yaw: entry.yaw, scale: new THREE.Vector3(.38, .16, 1.35) })), 'CITY_BENCH_SEATS');
    batch(cylinder, this.materials.navy, benches.flatMap(entry => [-.45, .45].map(offset => ({ position: at(entry, .34, .2).addScaledVector(entry.s.tangent, offset), yaw: entry.yaw, scale: new THREE.Vector3(1, .68, 1) }))), 'CITY_BENCH_LEGS');
    const bins = pick(3);
    batch(this.unitBox, this.materials.foliage, bins.map(entry => ({ position: at(entry, .46, -.35), yaw: entry.yaw, scale: new THREE.Vector3(.42, .92, .42) })), 'CITY_TRASH_BINS');
    batch(this.unitBox, this.materials.navy, bins.filter((_, index) => index % 2 === 0).map(entry => ({ position: at(entry, .7, 1.0), yaw: entry.yaw, scale: new THREE.Vector3(.9, 1.4, .65) })), 'CITY_DUMPSTERS');
    batch(bollardGeo, this.materials.cream, slots.filter((_, index) => index % 2 === 0).map(entry => ({ position: at(entry, .31, .7), yaw: entry.yaw })), 'CITY_BOLLARDS');
    const shelters = pick(8);
    batch(cylinder, this.materials.navy, shelters.flatMap(entry => [-.85, .85].map(offset => ({ position: at(entry, 1.35, -.2).addScaledVector(entry.s.tangent, offset), yaw: entry.yaw, scale: new THREE.Vector3(1, 2.7, 1) }))), 'CITY_BUS_SHELTER_POSTS');
    batch(this.unitBox, this.materials.navy, shelters.map(entry => ({ position: at(entry, 2.72, -.2), yaw: entry.yaw, scale: new THREE.Vector3(.5, .14, 2.15) })), 'CITY_BUS_SHELTER_ROOFS');
    batch(this.unitBox, this.materials.window, shelters.map(entry => ({ position: at(entry, 1.3, -.35), yaw: entry.yaw, scale: new THREE.Vector3(.05, 2.2, 1.65) })), 'CITY_BUS_SHELTER_GLASS');
    batch(cylinder, this.materials.navy, signs.map(entry => ({ position: at(entry, .55, -.15), yaw: entry.yaw, scale: new THREE.Vector3(1, 1.1, 1) })), 'CITY_PARKING_METERS');
    batch(this.unitBox, this.materials.blue, bins.map(entry => ({ position: at(entry, .58, .7), yaw: entry.yaw, scale: new THREE.Vector3(.36, .72, .38) })), 'CITY_MAILBOXES');

    // Trees/grates, hedge planters, and tiny grass tufts break up long pavement runs.
    const green = pick(3);
    batch(this.unitBox, this.materials.navy, green.map(entry => ({ position: at(entry, .035, .15), yaw: entry.yaw, scale: new THREE.Vector3(1.15, .07, 1.15) })), 'CITY_TREE_GRATES');
    batch(new THREE.CylinderGeometry(.09, .12, 1.7, 6), this.materials.trunk, green.map(entry => ({ position: at(entry, .88, .15), yaw: entry.yaw })), 'CITY_TREE_TRUNKS');
    batch(new THREE.DodecahedronGeometry(.74, 0), this.materials.foliage, green.map(entry => ({ position: at(entry, 2.1, .15), yaw: entry.yaw, scale: new THREE.Vector3(1.35, 1.45, 1.35) })), 'CITY_TREE_CANOPIES');
    batch(this.unitBox, this.materials.cream, bins.map(entry => ({ position: at(entry, .36, 1.1), yaw: entry.yaw, scale: new THREE.Vector3(.7, .72, 1.4) })), 'CITY_HEDGE_PLANTERS');
    batch(this.unitBox, this.materials.foliage, bins.map(entry => ({ position: at(entry, .78, 1.1), yaw: entry.yaw, scale: new THREE.Vector3(.58, .42, 1.2) })), 'CITY_HEDGES');

    // Compact building-side and utility details: fire-escape silhouettes, AC
    // boxes, scaffolding, subway railings, transformers, and billboards.
    const accents = pick(6);
    batch(this.unitBox, this.materials.navy, accents.flatMap(entry => [3.5, 5.1, 6.7].map(y => ({ position: at(entry, y, -3.0), yaw: entry.yaw, scale: new THREE.Vector3(.22, .12, 1.55) }))), 'CITY_FIRE_ESCAPE_PLATFORMS');
    batch(this.unitBox, this.materials.cream, accents.map(entry => ({ position: at(entry, 4.2, -2.7), yaw: entry.yaw, scale: new THREE.Vector3(.38, .36, .55) })), 'CITY_AC_UNITS');
    batch(cylinder, this.materials.gold, accents.flatMap(entry => [-1.1, 1.1].map(offset => ({ position: at(entry, 1.65, -1.8).addScaledVector(entry.s.tangent, offset), yaw: entry.yaw, scale: new THREE.Vector3(1, 3.3, 1) }))), 'CITY_SCAFFOLDING');
    batch(this.unitBox, this.materials.navy, accents.map(entry => ({ position: at(entry, .08, .15), yaw: entry.yaw, scale: new THREE.Vector3(1.35, .16, 2.0) })), 'CITY_SUBWAY_ENTRANCES');
    batch(cylinder, this.materials.foliage, accents.flatMap(entry => [-.9, .9].map(offset => ({ position: at(entry, .62, .15).addScaledVector(entry.s.tangent, offset), yaw: entry.yaw, scale: new THREE.Vector3(1, 1.24, 1) }))), 'CITY_SUBWAY_RAILS');
    batch(this.unitBox, this.materials.trunk, accents.map(entry => ({ position: at(entry, .8, -.95), yaw: entry.yaw, scale: new THREE.Vector3(.75, 1.6, .7) })), 'CITY_TRANSFORMERS');
    accents.forEach((entry, index) => {
      const advert = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.7, 2.8), new THREE.MeshBasicMaterial({ map: signTexture(index % 2 ? 'CITY LOOP' : 'RACE NIGHT', index % 2 ? '#25aead' : '#e85f58'), side: THREE.DoubleSide }));
      advert.name = 'CITY_ELECTRONIC_BILLBOARD'; advert.position.copy(at(entry, 5.6, -2.0)); advert.rotation.y = entry.yaw; this.props.add(advert);
    });

    // Low-profile manholes sit flush with the asphalt and deliberately have no
    // collision. Steam is deferred until the particle/VFX pass.
    const manholes = new THREE.InstancedMesh(new THREE.CircleGeometry(.38, 12), this.materials.navy, 10);
    const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    for (let i = 0; i < 10; i += 1) { const sample = this.track.sampleAt((.07 + i / 10) % 1); matrix.compose(new THREE.Vector3(sample.p.x, .055, sample.p.z), flat, new THREE.Vector3(1, 1, 1)); manholes.setMatrixAt(i, matrix); }
    manholes.name = 'CITY_MANHOLES'; manholes.instanceMatrix.needsUpdate = true; this.props.add(manholes);

    // High, non-colliding visual overpass: adds a skyline layer without
    // touching the drivable route, checkpoints, or camera clearance at road level.
    const overpass = this.track.sampleAt(.44); const overpassYaw = Math.atan2(overpass.tangent.x, overpass.tangent.z);
    for (const side of [-1, 1]) {
      const support = this.safeRoadsidePose(.44, side, 1.2, 1.2, 15.0);
      if (support) this.addBox(this.props, support.position, [1.15, 10.8, 1.15], this.materials.navy, support.yaw, 'CITY_OVERPASS_SUPPORT');
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(this.track.width + 10, .7, 3.7), this.materials.concrete || this.materials.cream);
    deck.name = 'CITY_OVERPASS'; deck.position.copy(overpass.p); deck.position.y = 11.6; deck.rotation.y = overpassYaw; deck.castShadow = false; deck.receiveShadow = false; this.props.add(deck);
  }
  buildLandmarks() {
    const hq = this.safeRoadsidePose(.07, 1, 13, 12, 26);
    if (hq) {
      this.addBox(this.near, hq.position, [11, 23, 10], this.materials.navy, hq.yaw, 'DLICOM_HQ');
      const crown = hq.position.clone(); crown.y = 23.7; this.addBox(this.near, crown, [12.4, 1.2, 11.2], this.materials.blue, hq.yaw, 'DLICOM_HQ_CROWN');
      const hqSign = new THREE.Mesh(new THREE.BoxGeometry(8.8, 2.1, .1), this.materials.sign); hqSign.position.copy(hq.position).addScaledVector(hq.s.normal, -1.7); hqSign.position.y = 16; hqSign.rotation.y = hq.yaw; this.near.add(hqSign);
    }
    // The track already owns the functional finish/checkpoint structures.
    // Do not add a second city gantry across the racing corridor.
    // The plaza is deliberately beyond the near-building clearance, not a
    // road decoration. Its smaller footprint leaves the pavement uninterrupted.
    const plaza = this.safeRoadsidePose(.56, 1, 8, 8, 24);
    if (plaza) {
      this.addBox(this.near, plaza.position, [8, .12, 8], this.materials.asphalt, plaza.yaw, 'DLICOM_PLAZA');
      const orb = new THREE.Mesh(new THREE.SphereGeometry(1.35, 16, 12), this.materials.blue); orb.position.copy(plaza.position); orb.position.y = 2.05; this.near.add(orb);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(.34, .34, .18), this.materials.cream); [-.48, .48].forEach(x => { const e = eye.clone(); e.position.copy(plaza.position).add(new THREE.Vector3(x, 2.2, -1.22)); this.near.add(e); });
      const halo = new THREE.Mesh(new THREE.TorusGeometry(1.7, .10, 6, 18), this.materials.violet); halo.position.copy(plaza.position); halo.position.y = 2.05; halo.rotation.x = Math.PI / 2; this.near.add(halo);
    }
  }
  buildSkyline() {
    const geo = new THREE.BoxGeometry(1, 1, 1), materials = [this.materials.navy, this.materials.blue, this.materials.violet];
    materials.forEach((mat, k) => {
      const entries = [];
      for (let i = 0; i < 22; i += 1) {
        const w = 5 + (i % 3) * 2, h = 12 + ((i * 7 + k) % 6) * 5, d = 5 + (i % 2) * 3;
        const p = this.safeRoadsidePose((i / 22 + k * .015) % 1, i % 2 ? -1 : 1, w, d, 42 + (i % 4) * 5);
        if (p) entries.push({ p, w, h, d });
      }
      const mesh = new THREE.InstancedMesh(geo, mat, entries.length); const m = new THREE.Matrix4();
      entries.forEach((entry, i) => { m.compose(new THREE.Vector3(entry.p.position.x, entry.h / 2, entry.p.position.z), new THREE.Quaternion().setFromAxisAngle(UP, entry.p.yaw), new THREE.Vector3(entry.w, entry.h, entry.d)); mesh.setMatrixAt(i, m); });
      mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = false; this.far.add(mesh);
    });
  }
  setQuality(profile) { this.props.visible = profile !== 'low'; this.far.visible = profile !== 'low'; this.near.traverse(node => { if (node.isMesh) node.castShadow = false; }); }
}
