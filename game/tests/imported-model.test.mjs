import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { prepareImportedKart } from '../vehicle/importedModel.js';
import { KartVisual } from '../vehicle/KartVisual.js';
import { readFileSync } from 'node:fs';
import { ExhaustFlames } from '../vehicle/ExhaustFlames.js';

test('twin exhaust flames grow with throttle and boost, and fade off at rest',()=>{
  const model=new THREE.Group(),asset=new THREE.Group(),chassis=new THREE.Group();chassis.name='CHASSIS';asset.add(chassis);model.add(asset);
  const effect=new ExhaustFlames(model),kart={speed:10,visualThrottle:0,boostTimer:0};
  effect.update(1,kart);const coasting=effect.intensity;
  kart.visualThrottle=1;effect.update(1,kart);const accelerating=effect.intensity;
  kart.boostTimer=.85;effect.update(1,kart);assert.ok(effect.intensity>accelerating && accelerating>coasting);
  assert.equal(effect.jets.length,2);assert.ok(effect.jets.every(j=>j.visible&&j.position.z<-.94));
  assert.equal(effect.jets[0].children[0].geometry,effect.jets[1].children[0].geometry);
  kart.speed=0;kart.visualThrottle=0;kart.boostTimer=0;effect.update(1,kart);
  assert.ok(effect.jets.every(j=>!j.visible));
});

// Decode actual exported geometry and node transforms without needing an image
// decoder/WebGL context. Tests exercise the production animation adapter.
function geometryScene(bytes,json) {
  const binaryStart=20+bytes.readUInt32LE(12)+8;
  const nodes=json.nodes.map(n=>{
    let object=new THREE.Group();
    if(n.mesh!==undefined) {
      const p=json.meshes[n.mesh].primitives[0],a=json.accessors[p.attributes.POSITION],v=json.bufferViews[a.bufferView];
      const positions=new Float32Array(a.count*3),start=binaryStart+(v.byteOffset||0)+(a.byteOffset||0);
      for(let i=0;i<a.count;i++)for(let k=0;k<3;k++)positions[i*3+k]=bytes.readFloatLE(start+i*(v.byteStride||12)+k*4);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));object=new THREE.Mesh(geometry);
    }
    object.name=n.name||'';object.userData=n.extras||{};
    if(n.translation)object.position.fromArray(n.translation);
    if(n.rotation)object.quaternion.fromArray(n.rotation);
    if(n.scale)object.scale.fromArray(n.scale);
    if(n.matrix)new THREE.Matrix4().fromArray(n.matrix).decompose(object.position,object.quaternion,object.scale);
    return object;
  });
  json.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));
  const root=new THREE.Group();json.scenes[json.scene||0].nodes.forEach(i=>root.add(nodes[i]));return root;
}

for (const folder of ['new-models/runtime','gautam-rebuilt']) for (const filename of ['GautamDriving.glb','GautamKart.glb']) {
  test(`${folder}/${filename} has a lightweight valid runtime mesh and ground-root adaptation`, () => {
    const bytes=readFileSync(new URL(`../../assets/characters/${folder}/${filename}`,import.meta.url));
    const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
    const primitive=json.meshes[0].primitives[0];
    const triangles=json.meshes.reduce((sum,m)=>sum+m.primitives.reduce((s,p)=>s+json.accessors[p.indices].count/3,0),0);
    assert.ok(triangles<= (filename==='GautamDriving.glb'?45000:30000));
    for(const label of ['FL','FR','RL','RR']) {
      const node=json.nodes.find(n=>n.name==='WHEEL_'+label);
      assert.ok(node?.extras.importedWheel);assert.ok(json.meshes[node.mesh].primitives.length);
    }
    assert.ok(bytes.length>1000);
    if(folder==='gautam-rebuilt') {
      assert.equal(json.images?.length||0,0);
      assert.ok(json.materials.every(m=>!m.alphaMode||m.alphaMode==='OPAQUE'),'No transparent tire material');
      assert.equal(json.meshes.length,filename==='GautamDriving.glb'?6:5);
      for(const label of ['FL','FR','RL','RR']) {
        const n=json.nodes.find(n=>n.name==='WHEEL_'+label),p=json.meshes[n.mesh].primitives[0];
        assert.equal(n.extras.treadPattern,'circumferential-vertical-grooves');
        assert.equal(n.extras.treadGrooveCount,3);
        const a=json.accessors[p.attributes.POSITION],v=json.bufferViews[a.bufferView],start=28+bytes.readUInt32LE(12)+(v.byteOffset||0)+(a.byteOffset||0);
        const keys=Array.from({length:a.count},(_,i)=>[0,1,2].map(k=>bytes.readFloatLE(start+i*(v.byteStride||12)+k*4).toFixed(6)).join(','));
        const ia=json.accessors[p.indices],iv=json.bufferViews[ia.bufferView],indexStart=28+bytes.readUInt32LE(12)+(iv.byteOffset||0)+(ia.byteOffset||0),wide=ia.componentType===5125;
        const read=i=>wide?bytes.readUInt32LE(indexStart+i*4):bytes.readUInt16LE(indexStart+i*2);
        const edges=new Map();
        for(let i=0;i<ia.count;i+=3) {
          const t=[keys[read(i)],keys[read(i+1)],keys[read(i+2)]];
          if(new Set(t).size<3)continue;
          for(let k=0;k<3;k++){const key=[t[k],t[(k+1)%3]].sort().join('|');edges.set(key,(edges.get(key)||0)+1);}
        }
        assert.ok([...edges.values()].every(count=>count===2),`${label} must contain closed surfaces, not cut-out tire holes`);
      }
    } else assert.equal(json.images.length,1);
    // Reconstruct source bounds with a box fixture; normalization is identical
    // for arbitrary meshes with the same bounds and has no rig dependencies.
    const accessor=json.accessors[primitive.attributes.POSITION];
    const min=new THREE.Vector3(...accessor.min),max=new THREE.Vector3(...accessor.max);
    const dimensions=max.clone().sub(min),center=min.clone().add(max).multiplyScalar(.5);
    const source=new THREE.Group();const mesh=new THREE.Mesh(new THREE.BoxGeometry(dimensions.x,dimensions.y,dimensions.z));mesh.position.copy(center);source.add(mesh);
    const model=prepareImportedKart(source);
    const box=new THREE.Box3().setFromObject(model);
    assert.ok(Math.abs(box.min.y)<1e-6);assert.ok(Math.abs(box.getSize(new THREE.Vector3()).x-1.85)<1e-6);
    assert.ok(Math.abs(box.min.x+box.max.x)<1e-6);assert.ok(Math.abs(box.min.z+box.max.z)<1e-6);
    const kart={position:new THREE.Vector3(),yaw:0,speed:20,lean:0,pitch:0,tumbleAngle:Math.PI/2};
    const visual=new KartVisual(kart,model);visual.update(1/60);
    assert.ok(new THREE.Box3().setFromObject(visual.root).min.y>=-1e-6,'Tumbling imported model must stay above the road');
    const actual=prepareImportedKart(geometryScene(bytes,json));
    const actualVisual=new KartVisual({...kart,tumbleAngle:0,lean:-.18},actual);
    actualVisual.update(.02);
    assert.ok(actualVisual.wheels.every(w=>w.rotation.x>0));
    assert.ok(actualVisual.front.every(w=>w.rotation.y<0));
    const angles=actualVisual.wheels.map(w=>w.rotation.x);
    actualVisual.kart.speed=-20;actualVisual.update(.02);
    assert.ok(actualVisual.wheels.every((w,i)=>w.rotation.x<angles[i]));
    actualVisual.kart.speed=0;actualVisual.kart.lean=0;
    for(let i=0;i<16;i++) {
      actualVisual.kart.tumbleAngle=i*Math.PI/8;actualVisual.update(1/60);
      assert.ok(new THREE.Box3().setFromObject(actualVisual.root).min.y>=-1e-5,'Actual split-wheel mesh stays above road during tumble');
    }
    actualVisual.kart.tumbleDuration=.86;
    actualVisual.kart.tumbleTurns=1;
    for(const direction of [-1,1]) {
      actualVisual.kart.tumbleDirection=direction;
      for(let i=0;i<120;i++) {
        actualVisual.kart.tumbleTimer=.86*(1-i/120);
        actualVisual.update(1/120);
        assert.ok(new THREE.Box3().setFromObject(actualVisual.root).min.y>=-1e-5,'Timed chassis-pivot tumble never penetrates the solid road');
      }
    }
    actualVisual.kart.tumbleTimer=0;actualVisual.kart.tumbleAngle=0;
    actualVisual.update(1/120);
    assert.ok(actual.position.distanceTo(actualVisual.modelRestPosition)<1e-9,'Landing restores the original model position');
  });
}

test('imported wheels roll forward, reverse, stop and steer front axles only',()=>{
  const model=new THREE.Group();
  for(const label of ['FL','FR','RL','RR']) {
    const axle=new THREE.Group();axle.name=(label.startsWith('F')?'STEER_WHEEL_':'AXLE_')+label;
    const wheel=new THREE.Mesh(new THREE.BoxGeometry(.3,.6,.6));wheel.name='WHEEL_'+label;wheel.userData.importedWheel=true;
    axle.add(wheel);model.add(axle);
  }
  const kart={position:new THREE.Vector3(),yaw:0,speed:3,lean:0,pitch:0};
  const visual=new KartVisual(kart,model);visual.update(.1);
  assert.ok(visual.wheels.every(w=>Math.abs(w.rotation.x-1)<1e-5));
  kart.speed=-3;visual.update(.1);assert.ok(visual.wheels.every(w=>Math.abs(w.rotation.x)<1e-5));
  kart.speed=0;kart.lean=-.18;visual.update(.1);
  assert.ok(visual.wheels.every(w=>Math.abs(w.rotation.x)<1e-5));
  assert.ok(visual.front.every(w=>w.rotation.y<0));
  kart.lean=.18;visual.update(.1);assert.ok(visual.front.every(w=>w.rotation.y>0));
  assert.equal(model.getObjectByName('AXLE_RL').rotation.y,0);
  // Steering must remain visible even with zero chassis lean and zero speed.
  kart.lean=0;kart.visualSteer=1;visual.update(.5);
  assert.ok(visual.front.every(w=>w.rotation.y<-.4));
  assert.equal(visual.model.rotation.z,0);
  kart.visualSteer=-1;visual.update(.5);assert.ok(visual.front.every(w=>w.rotation.y>.4));
  kart.visualSteer=0;visual.update(1);assert.ok(visual.front.every(w=>Math.abs(w.rotation.y)<.001));
});
