import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FixedStepLoop } from './core/FixedStepLoop.js';
import { InputState } from './input/InputState.js';
import { KeyboardInput } from './input/KeyboardInput.js';
import { TouchControls } from './input/TouchControls.js';
import { KART_TUNING, CAMERA, QUALITY_PROFILES, chooseQuality, LAPS } from './config/game-config.js?v=shield-and-checkers';
import { SwitchbackYard } from './track/SwitchbackYard.js?v=visible-checkers';
import { ArcadeKart } from './vehicle/ArcadeKart.js?v=ground-grid-5i';
import { KartVisual } from './vehicle/KartVisual.js';
import { RaceSystem } from './race/RaceSystem.js?v=lap-banner';
import { RacingLineAI } from './ai/RacingLineAI.js?v=cpu-powerups';
import { PowerupSystem } from './powerups/PowerupSystem.js?v=vertical-zipcap';
import { UI } from './ui/UI.js?v=lap-banner';

const canvas = document.querySelector('#game');
const ui = new UI();
let profileName = chooseQuality(); document.querySelector('#quality').value = profileName;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x071a27); scene.fog = new THREE.Fog(0x071a27, 40, 92);
const camera = new THREE.PerspectiveCamera(CAMERA.minFov, 1, .1, 140);
const hemisphere = new THREE.HemisphereLight(0x91d7ef, 0x1e3d28, 2.1); scene.add(hemisphere);
const sun = new THREE.DirectionalLight(0xffe2b8, 3.0); sun.position.set(18, 32, -10); sun.castShadow = true; sun.shadow.camera.left = -35; sun.shadow.camera.right = 35; sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35; scene.add(sun);
const fill = new THREE.DirectionalLight(0x4f9ee8, 1.2); fill.position.set(-22, 12, 18); scene.add(fill);
const loader = new GLTFLoader();
const input = new InputState(); const keyboardInput = new KeyboardInput(input); const touchInput = new TouchControls(input);
const autoplaySmokeTest = new URLSearchParams(location.search).has('autoplay');
const previewFinish = new URLSearchParams(location.search).has('previewFinish');
let game = null; let frameSamples = []; let lastRender = performance.now(); let qualityProfile;

function applyQuality(name) {
  profileName = name; qualityProfile = QUALITY_PROFILES[name]; renderer.setPixelRatio(Math.min(devicePixelRatio, qualityProfile.dpr)); renderer.shadowMap.enabled = qualityProfile.shadows; sun.shadow.mapSize.set(qualityProfile.shadowSize || 512, qualityProfile.shadowSize || 512);
}
applyQuality(profileName); ui.onQuality = applyQuality;

function assertAsset(root, names, label) { const missing = names.filter(name => !root.getObjectByName(name)); if (missing.length) throw new Error(`${label} is missing required nodes: ${missing.join(', ')}`); }
function shadowify(root) { root.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } }); }

async function boot() {
  try {
    const [characterGltf, kartGltf] = await Promise.all([
      loader.loadAsync('../assets/characters/guatam.glb'), loader.loadAsync('../assets/vehicles/guatam-kart.glb?v=approved-palette'),
    ]);
    assertAsset(characterGltf.scene, ['RIG_guatam_humanoid'], 'Guatam');
    assertAsset(kartGltf.scene, ['DRIVER_SEAT','CAMERA_TARGET','WHEEL_FL','WHEEL_FR','WHEEL_RL','WHEEL_RR','STEER_WHEEL_FL','STEER_WHEEL_FR','STEERING_WHEEL'], 'Guatam kart');
    shadowify(characterGltf.scene); shadowify(kartGltf.scene);
    game = createGame(characterGltf, kartGltf);
    ui.hideLoading(); document.querySelector('#start').classList.remove('hidden');
    new FixedStepLoop({ update, render }).start();
  } catch (error) { console.error(error); document.querySelector('#loading').innerHTML = `<div class="brand">LOAD<span>ERROR</span></div><p>${error.message}</p>`; }
}

function createGame(characterGltf, kartGltf) {
  const track = new SwitchbackYard(scene); const racers = [];
  const playerKart = new ArcadeKart('player', KART_TUNING, track.getGridPose(0));
  const playerVisual = new KartVisual(playerKart, kartGltf.scene.clone(true), characterGltf.scene, characterGltf.animations); scene.add(playerVisual.root);
  racers.push({ id: 'guatam', player: true, kart: playerKart, visual: playerVisual });
  for (let i = 0; i < 4; i += 1) {
    const kart = new ArcadeKart(`cpu-${i}`, KART_TUNING, track.getGridPose(i + 1)); const model = kartGltf.scene.clone(true); shadowify(model);
    // Test pilots deliberately retain the approved Guatam kart palette. The
    // old colored head-marker spheres made these shared karts look recolored.
    const visual = new KartVisual(kart, model); scene.add(visual.root);
    racers.push({ id: `test-pilot-${i+1}`, player: false, kart, visual, ai: null });
  }
  const race = new RaceSystem(racers, track); race.state = 'READY'; racers.slice(1).forEach((racer, index) => racer.ai = new RacingLineAI(racer, track, index + 1));
  const powerups = new PowerupSystem(scene, track);
  return { track, racers, player: racers[0], playerAI: new RacingLineAI(racers[0], track, 0), race, powerups, cameraTarget: new THREE.Vector3(), cameraPosition: new THREE.Vector3(), clock: 0 };
}

function requestMobileFullscreen() {
  const mobileLayout = matchMedia('(pointer: coarse)').matches || innerWidth <= 760;
  const target = document.documentElement;
  const request = target.requestFullscreen || target.webkitRequestFullscreen;
  if (!mobileLayout || document.fullscreenElement || !request) return;
  try { request.call(target)?.catch?.(() => {}); } catch { /* Browser declined fullscreen. */ }
}

document.querySelector('#start-race').addEventListener('click', () => { if (!game) return; requestMobileFullscreen(); document.querySelector('#start').classList.add('hidden'); game.race.state = 'COUNTDOWN'; game.race.countdown = 3; });

function resolveKartCollisions(racers) {
  for (let i = 0; i < racers.length; i += 1) for (let j = i + 1; j < racers.length; j += 1) {
    const a = racers[i].kart, b = racers[j].kart;
    // A recorded finisher remains in RaceSystem for the results, but must
    // never become a physical obstacle for racers still on the final lap.
    if (a.finished || b.finished) continue;
    const dx = b.position.x - a.position.x, dz = b.position.z - a.position.z; const d2 = dx*dx + dz*dz; const min = a.tuning.collisionRadius + b.tuning.collisionRadius;
    if (d2 && d2 < min * min) {
      const d = Math.sqrt(d2), push = min - d, nx = dx / d, nz = dz / d;
      // Guarded karts cannot be displaced, slowed, or stunned by another
      // racer's kart. The attacking kart is the only one pushed away.
      if (a.guardTimer > 0 && b.guardTimer > 0) continue;
      if (a.guardTimer > 0) { b.position.x += nx * push; b.position.z += nz * push; b.speed *= .97; continue; }
      if (b.guardTimer > 0) { a.position.x -= nx * push; a.position.z -= nz * push; a.speed *= .97; continue; }
      a.position.x -= nx * push * .5; a.position.z -= nz * push * .5;
      b.position.x += nx * push * .5; b.position.z += nz * push * .5;
      a.speed *= .985; b.speed *= .985;
    }
  }
}

function retireFinishedCpuVisuals(dt, racers) {
  racers.forEach(racer => {
    if (racer.player || !racer.kart.finished || racer.retired) return;
    racer.finishExitTimer += dt;
    if (racer.finishExitTimer >= racer.kart.tuning.cpuFinishExitDelay) {
      racer.retired = true;
      racer.visual.root.visible = false;
    }
  });
}

function update(dt) {
  if (!game) return; const { race, player, racers, track, powerups } = game; game.clock += dt;
  input.clear(); keyboardInput.update(); touchInput.update();
  const enabled = race.state === 'RACING' || race.state === 'PLAYER_FINISHED';
  if (input.consume('item') && enabled) powerups.use(player); if (input.consume('recover')) input.recover = true;
  const playerActions = autoplaySmokeTest ? game.playerAI.update(dt) : input;
  if (autoplaySmokeTest && playerActions.useItem && enabled) powerups.use(player);
  player.kart.update(dt, playerActions, track, enabled && race.state === 'RACING');
  for (const racer of racers) if (!racer.player && !racer.kart.finished) { const actions = racer.ai.update(dt); if (actions.useItem && enabled) powerups.use(racer); racer.kart.update(dt, actions, track, enabled); }
  resolveKartCollisions(racers); powerups.update(dt, racers); race.update(dt);
  track.setFinalLapVisual(previewFinish || player.lap >= LAPS - 1);
  retireFinishedCpuVisuals(dt, racers); racers.forEach(racer => { if (!racer.retired) racer.visual.update(dt); });
}

function updateCamera(dt) {
  const kart = game.player.kart, f = kart.forward(new THREE.Vector3()); const speed = Math.min(1, Math.abs(kart.speed) / KART_TUNING.maxSpeed); const target = kart.position.clone().add(new THREE.Vector3(0, .85, 0)).addScaledVector(f, CAMERA.lookAhead * speed);
  const desired = target.clone().addScaledVector(f, -CAMERA.distance).add(new THREE.Vector3(0, CAMERA.height, 0)); const smoothing = 1 - Math.exp(-CAMERA.smoothing * dt * 60 / 60);
  camera.position.lerp(desired, smoothing); camera.lookAt(target); camera.fov += ((CAMERA.minFov + (CAMERA.maxFov - CAMERA.minFov) * speed) - camera.fov) * .08; camera.updateProjectionMatrix();
}

function render() {
  if (!game) return; const now = performance.now(); const delta = now - lastRender; lastRender = now; frameSamples.push(delta); if (frameSamples.length > 30) frameSamples.shift(); updateCamera(1/60);
  const info = renderer.info.render; const avg = frameSamples.reduce((a,b)=>a+b,0) / frameSamples.length; ui.update(game.race, game.player, { fps: Math.round(1000 / avg), ms: avg.toFixed(1), calls: info.calls });
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.render(scene, camera);
}

boot();
