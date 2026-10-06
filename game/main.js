import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FixedStepLoop } from './core/FixedStepLoop.js';
import { InputState } from './input/InputState.js';
import { KeyboardInput } from './input/KeyboardInput.js';
import { TouchControls } from './input/TouchControls.js?v=landscape-controls-1';
import { KART_TUNING, CPU_TUNING, CAMERA, QUALITY_PROFILES, chooseQuality, LAPS } from './config/game-config.js?v=competitive-ai-2';
import { SwitchbackYard } from './track/SwitchbackYard.js?v=dlicom-branded-gateways-4';
import { ArcadeKart } from './vehicle/ArcadeKart.js?v=exhaust-flames-1';
import { KartVisual } from './vehicle/KartVisual.js?v=quang-1';
import { prepareImportedKart } from './vehicle/importedModel.js';
import { RACERS, racerId, raceLineup } from '../shared/racers.js?v=kapuriya-1';
import { RaceSystem } from './race/RaceSystem.js?v=lap-banner';
import { RacingLineAI } from './ai/RacingLineAI.js?v=competitive-ai-2';
import { PowerupSystem } from './powerups/PowerupSystem.js?v=zipcap-duration-4';
import { UI } from './ui/UI.js?v=gapless-kart-audio-1';
import { DlicomCity } from './environment/DlicomCity.js?v=urban-infrastructure-1';
import { AudioManager } from './audio/AudioManager.js?v=gapless-kart-audio-1';
import { prepareMobilePresentation, requestMobilePresentation } from '../shared/mobile-presentation.js?v=persistent-landscape-1';

const canvas = document.querySelector('#game');
prepareMobilePresentation();
const ui = new UI();
const audio = new AudioManager(); ui.bindAudio(audio);
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
const pausePanel = document.querySelector('#pause-panel');
const raceSettingsPanel = document.querySelector('#race-settings-panel');
const raceSettingsClose = document.querySelector('#close-race-settings');
const raceQualityChoice = document.querySelector('#race-quality-choice');
const raceControlChoice = document.querySelector('#race-control-choice');
const autoplaySmokeTest = new URLSearchParams(location.search).has('autoplay');
const previewFinish = new URLSearchParams(location.search).has('previewFinish');
const selectedRacer = racerId(new URLSearchParams(location.search).get('racer'));
let game = null; let city = null; let frameSamples = []; let lastRender = performance.now(); let qualityProfile;

function applyQuality(name) {
  profileName = name; qualityProfile = QUALITY_PROFILES[name]; renderer.setPixelRatio(Math.min(devicePixelRatio, qualityProfile.dpr)); renderer.shadowMap.enabled = qualityProfile.shadows; sun.shadow.mapSize.set(qualityProfile.shadowSize || 512, qualityProfile.shadowSize || 512); city?.setQuality(name);
}
applyQuality(profileName); ui.onQuality = applyQuality;

function shadowify(root) { root.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } }); }

async function boot() {
  try {
    const lineup = raceLineup(selectedRacer);
    // Fetch/decode each character once; each racer receives its own cloned nodes.
    const entries = await Promise.all([...new Set(lineup)].map(async id => [id, await loader.loadAsync(RACERS[id].driving)]));
    game = createGame(lineup, new Map(entries));
    const startButton = document.querySelector('#start-race');
    startButton.disabled = false; startButton.setAttribute('aria-busy', 'false'); audio.playMusic('menu');
    new FixedStepLoop({ update, render }).start();
  } catch (error) {
    console.error(error);
    const message = document.querySelector('#race-load-error');
    message.textContent = 'The race could not load. Please reload and try again.'; message.hidden = false;
    document.querySelector('#start-race').setAttribute('aria-busy', 'false');
  }
}

function createGame(lineup, models) {
  const track = new SwitchbackYard(scene); city = new DlicomCity(scene, track, profileName); const racers = [];
  const playerKart = new ArcadeKart('player', KART_TUNING, track.getGridPose(0));
  const playerModel = prepareImportedKart(models.get(lineup[0]).scene); shadowify(playerModel);
  const playerVisual = new KartVisual(playerKart, playerModel); scene.add(playerVisual.root);
  racers.push({ id: selectedRacer, characterId: lineup[0], name: RACERS[lineup[0]].name, player: true, kart: playerKart, visual: playerVisual });
  // CPU-only pace and steering tuning. Player handling is unchanged; opponents
  // have a consistent modest speed advantage, not position-based rubberbanding.
  const cpuKartTuning = { ...KART_TUNING, maxSpeed: CPU_TUNING.maxSpeed, acceleration: CPU_TUNING.acceleration, steerRate: 2.14, highSpeedSteerFactor: .52 };
  for (let i = 0; i < 4; i += 1) {
    const characterId = lineup[i + 1];
    const kart = new ArcadeKart(`cpu-${i}`, cpuKartTuning, track.getGridPose(i + 1)); const model = prepareImportedKart(models.get(characterId).scene); shadowify(model);
    const visual = new KartVisual(kart, model); scene.add(visual.root);
    racers.push({ id: `cpu-${i}`, characterId, name: RACERS[characterId].name, player: false, kart, visual, ai: null });
  }
  const race = new RaceSystem(racers, track); race.state = 'READY'; racers.slice(1).forEach((racer, index) => racer.ai = new RacingLineAI(racer, track, index + 1));
  const powerups = new PowerupSystem(scene, track);
  return { track, racers, player: racers[0], playerAI: new RacingLineAI(racers[0], track, 0), race, powerups, cameraTarget: new THREE.Vector3(), cameraPosition: new THREE.Vector3(), clock: 0 };
}

function setRacePaused(paused, { showPausePanel = true } = {}) {
  if (!game || game.race.state === 'RESULTS') return;
  game.paused = paused;
  input.clear();
  audio.setGameplayPaused(paused);
  pausePanel.hidden = !paused || !showPausePanel;
  const button = document.querySelector('#pause-race');
  button.setAttribute('aria-label', paused ? 'Resume race' : 'Pause race');
  button.setAttribute('aria-pressed', String(paused));
}

function savedSetting(key, fallback) {
  try { return localStorage.getItem(`dlikarts.${key}`) ?? fallback; } catch { return fallback; }
}

function syncRaceSettings() {
  raceQualityChoice.value = savedSetting('quality', 'auto');
  raceControlChoice.value = touchInput.controlMode;
}

function closeRaceSettings() {
  if (raceSettingsPanel.hidden) return;
  raceSettingsPanel.hidden = true;
  setRacePaused(false);
}

document.querySelector('#start-race').addEventListener('click', () => { if (!game) return; void audio.unlock(); audio.playSfx('uiSelect', { gain: .48, cooldown: 100 }); void requestMobilePresentation(); document.querySelector('#start').classList.add('hidden'); document.body.classList.add('race-live'); game.race.state = 'COUNTDOWN'; game.race.countdown = 3; });
document.querySelector('#pause-race').addEventListener('click', () => { if (!raceSettingsPanel.hidden) return; void audio.unlock(); setRacePaused(!game?.paused); });
document.querySelector('#resume-race').addEventListener('click', () => { void audio.unlock(); setRacePaused(false); });
document.querySelector('#open-race-settings').addEventListener('click', async () => {
  if (!game || game.race.state === 'RESULTS') return;
  void audio.unlock();
  syncRaceSettings(); setRacePaused(true, { showPausePanel: false });
  raceSettingsPanel.hidden = false; raceSettingsClose.focus();
});
raceSettingsClose.addEventListener('click', () => closeRaceSettings());
raceQualityChoice.addEventListener('change', () => {
  try { localStorage.setItem('dlikarts.quality', raceQualityChoice.value); } catch { /* Storage may be unavailable. */ }
  const quality = raceQualityChoice.value === 'auto' ? chooseQuality() : raceQualityChoice.value;
  applyQuality(quality); document.querySelector('#quality').value = quality;
});
raceControlChoice.addEventListener('change', () => {
  touchInput.setControlMode(raceControlChoice.value);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !raceSettingsPanel.hidden) { event.preventDefault(); closeRaceSettings(); }
});
document.querySelector('#exit-race').addEventListener('click', () => { if (!game) return; location.href = '../landing/?view=menu'; });

function resolveKartCollisions(racers) {
  for (let i = 0; i < racers.length; i += 1) for (let j = i + 1; j < racers.length; j += 1) {
    const a = racers[i].kart, b = racers[j].kart;
    // A recorded finisher remains in RaceSystem for the results, but must
    // never become a physical obstacle for racers still on the final lap.
    if (a.finished || b.finished) continue;
    const dx = b.position.x - a.position.x, dz = b.position.z - a.position.z; const d2 = dx*dx + dz*dz; const min = a.tuning.collisionRadius + b.tuning.collisionRadius;
    if (d2 && d2 < min * min) {
      const d = Math.sqrt(d2), push = min - d, nx = dx / d, nz = dz / d;
      if (a === game?.player.kart || b === game?.player.kart) audio.reportCollision(Math.abs(a.speed - b.speed) + push * 7);
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
  if (!game || game.paused) return; const { race, player, racers, track, powerups } = game; game.clock += dt;
  input.clear(); keyboardInput.update(); touchInput.update();
  const enabled = race.state === 'RACING' || race.state === 'PLAYER_FINISHED';
  if (input.consume('item') && enabled) powerups.use(player); if (input.consume('recover')) input.recover = true;
  const playerActions = autoplaySmokeTest && enabled ? game.playerAI.update(dt, racers, powerups) : input;
  player.lastActions = playerActions;
  if (autoplaySmokeTest && playerActions.useItem && enabled) powerups.use(player);
  player.kart.update(dt, playerActions, track, enabled && race.state === 'RACING');
  for (const racer of racers) if (!racer.player && !racer.kart.finished) { const actions = enabled ? racer.ai.update(dt, racers, powerups) : { throttle:0, brake:0, steer:0 }; racer.lastActions = actions; if (actions.useItem && enabled) powerups.use(racer); racer.kart.update(dt, actions, track, enabled); }
  resolveKartCollisions(racers); powerups.update(dt, racers); race.update(dt); audio.update(game, playerActions, dt);
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
  const info = renderer.info; const avg = frameSamples.reduce((a,b)=>a+b,0) / frameSamples.length; ui.update(game.race, game.player, { fps: Math.round(1000 / avg), ms: avg.toFixed(1), calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures }, audio.getDebug());
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.render(scene, camera);
}

boot();
