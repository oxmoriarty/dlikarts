import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#viewport');
const status = document.querySelector('#loading');
const statsEl = document.querySelector('#stats');
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x07101b, 7, 15);
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .065; controls.minDistance = 1.8; controls.maxDistance = 8;
scene.add(new THREE.HemisphereLight(0x8bc8ff, 0x13100a, 2.0));
const key = new THREE.DirectionalLight(0xffe0ba, 3.5); key.position.set(3,4,5); key.castShadow=true; key.shadow.mapSize.set(1024,1024); scene.add(key);
const rim = new THREE.DirectionalLight(0x569dff, 2.0); rim.position.set(-4,2,-3); scene.add(rim);
const floor = new THREE.Mesh(new THREE.CircleGeometry(5,48), new THREE.MeshStandardMaterial({color:0x111f2d,roughness:.88,metalness:.05}));
floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const grid = new THREE.GridHelper(10,20,0x27455e,0x192b3d); grid.position.y=.007; scene.add(grid);

let character, kart, mixer, clips = [], activeAction, activeClipName = '', viewingMode = 'combo', loaded = 0;
const node = (root, name) => root?.getObjectByName(name);
const loader = new GLTFLoader();
const counts = { character:null, kart:null };

function shadowify(root) { root.traverse(o => { if (o.isMesh) { o.castShadow=true; o.receiveShadow=true; } }); }
function measure(root, gltf) {
  const materials = new Set(), geometries = new Set(); let tris=0, vertices=0, bones=0;
  root.traverse(o => { if (o.isBone) bones++; if (!o.isMesh) return; geometries.add(o.geometry); const p=o.geometry.getAttribute('position'); vertices += p?.count || 0; tris += o.geometry.index ? o.geometry.index.count/3 : (p?.count || 0)/3; (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m)); });
  return { triangles:Math.round(tris), vertices, materials:materials.size, bones, clips:gltf.animations.map(a=>a.name), nodes:root.children.length };
}
function showStats() {
  if (!counts.character || !counts.kart) return;
  const c=counts.character,k=counts.kart;
  statsEl.textContent = `CHARACTER\n${c.triangles.toLocaleString()} tris · ${c.vertices.toLocaleString()} verts\n${c.materials} materials · ${c.bones} bones\n${c.clips.length} clips\n\nKART\n${k.triangles.toLocaleString()} tris · ${k.vertices.toLocaleString()} verts\n${k.materials} materials · wheels + sockets live`;
}
// Blender's exported +Z height becomes Three.js +Y; preserve that distinction
// here rather than baking a corrective root rotation into the runtime assets.
function fit(target, offset=1) {
  // Portrait viewports need a wider framing for the kart's 2.7 m wheelbase.
  const portraitBoost = camera.aspect < .85 ? 1.58 : 1;
  const distance = offset * portraitBoost;
  controls.target.copy(target); camera.position.copy(target).add(new THREE.Vector3(3.8*distance,2.8*distance,-5*distance)); controls.update();
}
function setMode(mode) {
  if (!character || !kart) return;
  viewingMode=mode;
  character.visible = mode !== 'kart'; kart.visible = mode !== 'character';
  if (mode==='combo') {
    // Source of truth: bind the character root to the exported socket rather
    // than duplicating a hand-tuned Blender-to-Three placement offset here.
    const seat = node(kart,'DRIVER_SEAT'); const cameraTarget = node(kart,'CAMERA_TARGET');
    const seatPosition = new THREE.Vector3(); const targetPosition = new THREE.Vector3();
    seat?.getWorldPosition(seatPosition); cameraTarget?.getWorldPosition(targetPosition);
    character.position.copy(seatPosition); character.quaternion.copy(kart.quaternion); character.scale.setScalar(.80);
    activateClip('seated-idle');
    fit(cameraTarget ? targetPosition : new THREE.Vector3(0,.85,0),.9);
  } else if (mode==='character') {
    character.position.set(0,0,0); character.scale.setScalar(1); activateClip('standing-idle'); fit(new THREE.Vector3(0,.8,0),.62);
  } else { fit(new THREE.Vector3(0,.55,0),.82); }
}
function activateClip(name, button) {
  if (!mixer || activeClipName===name) return;
  const clip=clips.find(c=>c.name===name) || clips[0];
  if (!clip) return;
  if(activeAction) activeAction.fadeOut(.12);
  activeAction=mixer.clipAction(clip); activeAction.reset().fadeIn(.12).play(); activeClipName=clip.name;
  document.querySelectorAll('#clips button').forEach(b=>b.classList.toggle('active',b===button || (!button && b.textContent===clip.name)));
}
function playClip(clip, button) { activateClip(clip.name,button); }
function setupClips() { const box=document.querySelector('#clips'); clips.forEach(clip=>{ const b=document.createElement('button'); b.textContent=clip.name; b.onclick=()=>playClip(clip,b); box.append(b); }); }
function setWheels() {
  if(!kart) return;
  const roll=THREE.MathUtils.degToRad(+document.querySelector('#wheelRoll').value);
  const frontControl=document.querySelector('#frontSteer');
  const wheelControl=document.querySelector('#steeringWheel');
  const steer=THREE.MathUtils.degToRad(+frontControl.value);
  const wheel=THREE.MathUtils.degToRad(+wheelControl.value);
  ['WHEEL_FL','WHEEL_FR','WHEEL_RL','WHEEL_RR'].forEach(n=>{const o=node(kart,n); if(o)o.rotation.x=roll;});
  ['STEER_WHEEL_FL','STEER_WHEEL_FR'].forEach(n=>{const o=node(kart,n); if(o)o.rotation.z=steer;});
  const sw=node(kart,'STEERING_WHEEL'); if(sw) sw.rotation.y=wheel;
  document.querySelector('#rollValue').value=`${Math.round(THREE.MathUtils.radToDeg(roll))}°`; document.querySelector('#steerValue').value=`${Math.round(THREE.MathUtils.radToDeg(steer))}°`; document.querySelector('#wheelValue').value=`${Math.round(THREE.MathUtils.radToDeg(wheel))}°`;
}
document.querySelector('#wheelRoll').addEventListener('input',setWheels);
document.querySelector('#steeringWheel').addEventListener('input',setWheels);
document.querySelector('#frontSteer').addEventListener('input',event=>{
  const degrees=+event.currentTarget.value;
  // Turn the rim farther than the front tyres, then choose an authored pose
  // whose two hand grips follow the same wheel arc. No per-driver runtime IK.
  document.querySelector('#steeringWheel').value=String(Math.round(-degrees*1.5));
  setWheels();
  if (viewingMode==='combo') activateClip(degrees < -2 ? 'steer-left' : degrees > 2 ? 'steer-right' : 'seated-idle');
});
document.querySelector('#focus').addEventListener('change',e=>setMode(e.target.value));
document.querySelector('#resetView').onclick=()=>setMode(document.querySelector('#focus').value);
Promise.all([
  loader.loadAsync('../assets/characters/guatam.glb'), loader.loadAsync('../assets/vehicles/guatam-kart.glb?v=approved-palette')
]).then(([cg,kg])=>{
  character=cg.scene; kart=kg.scene; character.name='CHARACTER_RUNTIME'; kart.name='KART_RUNTIME'; shadowify(character); shadowify(kart);
  scene.add(character,kart); counts.character=measure(character,cg); counts.kart=measure(kart,kg); clips=cg.animations; mixer=new THREE.AnimationMixer(character); setupClips(); showStats(); setMode('combo'); setWheels(); status.textContent='Runtime assets loaded'; status.classList.add('done');
}).catch(error=>{ console.error('GLB load failed',error); status.textContent='Asset load failed — see console'; });
function resize(){ const w=canvas.clientWidth,h=canvas.clientHeight; if(!w||!h)return; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); }
const clock=new THREE.Clock();
function render(){ requestAnimationFrame(render); const dt=clock.getDelta(); mixer?.update(dt); controls.update(); resize(); renderer.render(scene,camera); }
render();
